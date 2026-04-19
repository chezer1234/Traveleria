import express from 'express';
import crypto from 'crypto';
import db from '../db/connection.js';
import { calculateCountryPoints, calculateTotalTravelPoints, getCountryTier } from '../lib/points.js';
import { requireAuth, requireOwnership } from '../middleware/auth.js';
import {
  addCountrySchema,
  addCitySchema,
  addProvinceSchema,
  validateBody,
} from '../lib/schemas.js';
import * as changes from '../lib/changes.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  const user = await db('users')
    .where({ id: req.params.id })
    .select('id', 'identifier', 'home_country', 'created_at')
    .first();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

async function getUserTravelData(userId, homeCountryCode) {
  const allCountries = await db('countries')
    .select('code', 'name', 'region', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng');
  const homeCountry = allCountries.find(c => c.code === (homeCountryCode || '').toUpperCase());

  const allProvincesRaw = await db('provinces');
  const provincesByCountry = {};
  for (const p of allProvincesRaw) {
    if (!provincesByCountry[p.country_code]) provincesByCountry[p.country_code] = [];
    provincesByCountry[p.country_code].push(p);
  }

  const visitedRecords = await db('user_countries').where({ user_id: userId });

  const visitedCountries = [];
  for (const uc of visitedRecords) {
    const country = allCountries.find(c => c.code === uc.country_code);
    if (!country) continue;

    const tier = getCountryTier(country.code);

    const visitedCities = await db('user_cities')
      .join('cities', 'user_cities.city_id', 'cities.id')
      .where({ 'user_cities.user_id': userId, 'cities.country_code': country.code })
      .select('cities.id', 'cities.name', 'cities.population');

    const visitedProvinces = await db('user_provinces')
      .join('provinces', 'user_provinces.province_code', 'provinces.code')
      .where({ 'user_provinces.user_id': userId, 'provinces.country_code': country.code })
      .select('provinces.*');

    const allProvinces = provincesByCountry[country.code] || [];

    let allCities = [];
    if (tier === 1 || tier === 3) {
      allCities = await db('cities')
        .where({ country_code: country.code })
        .orderBy('population', 'desc');
    }

    visitedCountries.push({
      country,
      visitedCities,
      visitedProvinces,
      allProvinces,
      allCities,
      visited_at: uc.visited_at,
    });
  }

  return { homeCountry, allCountries, visitedCountries };
}

function fail(res, path, message) {
  return res.status(422).json({ error: 'Validation failed', errors: [{ path, message }] });
}

// ---------- Writes: JWT + ownership + schema + business rules + change feed ----------

router.post(
  '/:id/countries',
  requireAuth,
  requireOwnership('id'),
  validateBody(addCountrySchema),
  async (req, res) => {
    const { id } = req.params;
    const { country_code, visited_at } = req.body;

    const country = await db('countries').where({ code: country_code }).first();
    if (!country) return fail(res, 'country_code', 'Unknown country code');

    const existing = await db('user_countries')
      .where({ user_id: id, country_code: country.code })
      .first();
    if (existing) return fail(res, 'country_code', 'Already added');

    const row = {
      id: crypto.randomUUID(),
      user_id: id,
      country_code: country.code,
      visited_at: visited_at || null,
    };

    let change_id;
    await db.transaction(async (trx) => {
      await trx('user_countries').insert(row);
      change_id = await changes.record(trx, {
        table: 'user_countries', pk: row.id, op: 'insert', row,
      });
    });
    res.status(201).json({ ...row, change_id });
  }
);

router.delete(
  '/:id/countries/:code',
  requireAuth,
  requireOwnership('id'),
  async (req, res) => {
    const { id, code } = req.params;
    const upperCode = code.toUpperCase();

    const uc = await db('user_countries')
      .where({ user_id: id, country_code: upperCode })
      .first();
    if (!uc) return res.status(404).json({ error: 'Country not in your visited list' });

    // Collect doomed child rows before we touch anything, so we can emit an
    // accurate _changes entry per cascaded delete.
    const cityIds = await db('cities').where({ country_code: upperCode }).pluck('id');
    const cityVisits = cityIds.length
      ? await db('user_cities').where({ user_id: id }).whereIn('city_id', cityIds)
      : [];
    const provinceCodes = await db('provinces').where({ country_code: upperCode }).pluck('code');
    const provinceVisits = provinceCodes.length
      ? await db('user_provinces').where({ user_id: id }).whereIn('province_code', provinceCodes)
      : [];

    let last_change_id;
    await db.transaction(async (trx) => {
      for (const cv of cityVisits) {
        await trx('user_cities').where({ id: cv.id }).del();
        last_change_id = await changes.record(trx, { table: 'user_cities', pk: cv.id, op: 'delete' });
      }
      for (const pv of provinceVisits) {
        await trx('user_provinces').where({ id: pv.id }).del();
        last_change_id = await changes.record(trx, { table: 'user_provinces', pk: pv.id, op: 'delete' });
      }
      await trx('user_countries').where({ id: uc.id }).del();
      last_change_id = await changes.record(trx, { table: 'user_countries', pk: uc.id, op: 'delete' });
    });

    res.json({
      message: 'Country and associated city/province visits removed',
      change_id: last_change_id,
    });
  }
);

router.get('/:id/countries', async (req, res) => {
  const { id } = req.params;
  const data = await getUserTravelData(id, req.query.home_country);
  const { homeCountry, allCountries, visitedCountries } = data;

  const result = visitedCountries.map(({ country, visitedCities, visitedProvinces, allProvinces, allCities, visited_at }) => {
    const pts = calculateCountryPoints(country, homeCountry, allCountries, {
      visitedProvinces,
      visitedCities,
      allProvinces,
      allCities,
    });
    return {
      country_code: country.code,
      country_name: country.name,
      region: country.region,
      visited_at,
      cities_visited: visitedCities.length,
      provinces_visited: visitedProvinces.length,
      ...pts,
    };
  });

  res.json(result);
});

router.post(
  '/:id/cities',
  requireAuth,
  requireOwnership('id'),
  validateBody(addCitySchema),
  async (req, res) => {
    const { id } = req.params;
    const { city_id, visited_at } = req.body;

    const city = await db('cities').where({ id: city_id }).first();
    if (!city) return fail(res, 'city_id', 'Unknown city');

    const hasCountry = await db('user_countries')
      .where({ user_id: id, country_code: city.country_code })
      .first();
    if (!hasCountry) return fail(res, 'city_id', 'Add the country before logging a city visit');

    const existing = await db('user_cities').where({ user_id: id, city_id }).first();
    if (existing) return fail(res, 'city_id', 'Already logged');

    const row = {
      id: crypto.randomUUID(),
      user_id: id,
      city_id,
      visited_at: visited_at || null,
    };

    let change_id;
    await db.transaction(async (trx) => {
      await trx('user_cities').insert(row);
      change_id = await changes.record(trx, {
        table: 'user_cities', pk: row.id, op: 'insert', row,
      });
    });
    res.status(201).json({ ...row, change_id });
  }
);

router.delete(
  '/:id/cities/:cityId',
  requireAuth,
  requireOwnership('id'),
  async (req, res) => {
    const { id, cityId } = req.params;
    const existing = await db('user_cities').where({ user_id: id, city_id: cityId }).first();
    if (!existing) return res.status(404).json({ error: 'City visit not found' });

    let change_id;
    await db.transaction(async (trx) => {
      await trx('user_cities').where({ id: existing.id }).del();
      change_id = await changes.record(trx, {
        table: 'user_cities', pk: existing.id, op: 'delete',
      });
    });
    res.json({ message: 'City visit removed', change_id });
  }
);

router.post(
  '/:id/provinces',
  requireAuth,
  requireOwnership('id'),
  validateBody(addProvinceSchema),
  async (req, res) => {
    const { id } = req.params;
    const { province_code, visited_at } = req.body;

    const province = await db('provinces').where({ code: province_code }).first();
    if (!province) return fail(res, 'province_code', 'Unknown province');

    const hasCountry = await db('user_countries')
      .where({ user_id: id, country_code: province.country_code })
      .first();
    if (!hasCountry) return fail(res, 'province_code', 'Add the country before logging a province visit');

    const existing = await db('user_provinces').where({ user_id: id, province_code }).first();
    if (existing) return fail(res, 'province_code', 'Already logged');

    const row = {
      id: crypto.randomUUID(),
      user_id: id,
      province_code,
      visited_at: visited_at || null,
    };

    let change_id;
    await db.transaction(async (trx) => {
      await trx('user_provinces').insert(row);
      change_id = await changes.record(trx, {
        table: 'user_provinces', pk: row.id, op: 'insert', row,
      });
    });
    res.status(201).json({ ...row, change_id });
  }
);

router.delete(
  '/:id/provinces/:code',
  requireAuth,
  requireOwnership('id'),
  async (req, res) => {
    const { id, code } = req.params;
    const existing = await db('user_provinces').where({ user_id: id, province_code: code }).first();
    if (!existing) return res.status(404).json({ error: 'Province visit not found' });

    let change_id;
    await db.transaction(async (trx) => {
      await trx('user_provinces').where({ id: existing.id }).del();
      change_id = await changes.record(trx, {
        table: 'user_provinces', pk: existing.id, op: 'delete',
      });
    });
    res.json({ message: 'Province visit removed', change_id });
  }
);

router.get('/:id/provinces', async (req, res) => {
  const { id } = req.params;
  const visited = await db('user_provinces')
    .join('provinces', 'user_provinces.province_code', 'provinces.code')
    .where({ 'user_provinces.user_id': id })
    .select('provinces.*', 'user_provinces.visited_at');
  res.json(visited);
});

router.get('/:id/score', async (req, res) => {
  const { id } = req.params;
  const data = await getUserTravelData(id, req.query.home_country);
  const { homeCountry, allCountries, visitedCountries } = data;
  const result = calculateTotalTravelPoints(homeCountry, allCountries, visitedCountries);
  res.json({ user_id: id, ...result });
});

export default router;
