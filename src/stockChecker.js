const db = require('../config/database');
const logger = require('../config/logger');

async function checkStock(articleCode, colorCode) {
  logger.info(`Checking stock for Article: ${articleCode}, Color: ${colorCode}`);
  
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM stock WHERE material_number_id LIKE ?`;
    const materialNumberId = `%${articleCode}%${colorCode}%`;

    db.all(query, [materialNumberId], (err, rows) => {
      if (err) {
        logger.error('Database query error', err);
        reject(err);
      } else {
        logger.info(`Found ${rows.length} matching items`);
        resolve(rows);
      }
    });
  });
}

module.exports = { checkStock };
