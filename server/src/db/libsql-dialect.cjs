const Client_SQLite3 = require('knex/lib/dialects/sqlite3');
const { createClient } = require('@libsql/client');
const nodeFetch = require('node-fetch');
// sqld v0.24.x returns Content-Encoding: gzip on /v2/pipeline but closes the
// stream prematurely, causing ERR_STREAM_PREMATURE_CLOSE. compress:false tells
// node-fetch not to send Accept-Encoding and not to decompress responses, so
// sqld returns plain JSON and the truncated-gzip issue is bypassed entirely.
// node-fetch must be used (not globalThis.fetch) because hrana-client passes
// cross-fetch Request objects which are node-fetch Requests on Node.js.
const noGzipFetch = (input, opts) => nodeFetch(input, { ...opts, compress: false });

class Client_Libsql extends Client_SQLite3 {
  _driver() {
    return {
      Database: function(url) {
        // mock
      }
    };
  }
  
  acquireRawConnection() {
    const url = this.connectionSettings.filename;
    return Promise.resolve({
      client: createClient({ url, intMode: 'number', fetch: noGzipFetch }),
      tx: null
    });
  }
  
  destroyRawConnection(connection) {
    connection.client.close();
    return Promise.resolve();
  }
  
  async _query(connection, obj) {
    if (!obj.sql) throw new Error('The query is empty');
    
    try {
      const sqlUpper = obj.sql.toUpperCase();
      if (sqlUpper === 'BEGIN;' || sqlUpper === 'BEGIN') {
        connection.tx = await connection.client.transaction('write');
        obj.response = [];
        return obj;
      }
      if (sqlUpper === 'COMMIT;' || sqlUpper === 'COMMIT') {
        if (connection.tx) {
           await connection.tx.commit();
           connection.tx = null;
        }
        obj.response = [];
        return obj;
      }
      if (sqlUpper === 'ROLLBACK;' || sqlUpper === 'ROLLBACK') {
        if (connection.tx) {
           await connection.tx.rollback();
           connection.tx = null;
        }
        obj.response = [];
        return obj;
      }

      const target = connection.tx || connection.client;
      const response = await target.execute({ sql: obj.sql, args: obj.bindings || [] });
      
      obj.response = response.rows || [];
      if (response.lastInsertRowid !== undefined) {
         obj.response.lastInsertRowid = Number(response.lastInsertRowid);
      }
      if (response.rowsAffected !== undefined) {
         obj.response.rowsAffected = response.rowsAffected;
      }
      return obj;
    } catch (err) {
      throw err;
    }
  }
  
  processResponse(obj, runner) {
    if (obj.output) return obj.output.call(runner, obj.response);
    switch (obj.method) {
      case 'select':
      case 'pluck':
      case 'first':
        if (obj.method === 'pluck') return obj.response.map((row) => row[obj.pluck]);
        return obj.method === 'first' ? obj.response[0] : obj.response;
      case 'insert':
        // If RETURNING was used, rows contain the returned data
        if (obj.returning && obj.response.length > 0) {
          return obj.response;
        }
        return [obj.response.lastInsertRowid];
      case 'del':
      case 'update':
      case 'counter':
        // If RETURNING was used, return the rows
        if (obj.returning && obj.response.length > 0) {
          return obj.response;
        }
        return obj.response.rowsAffected;
      default:
        return obj.response;
    }
  }
}

module.exports = Client_Libsql;
