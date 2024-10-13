const db = require('../config/database');
const logger = require('../config/logger');

function viewDbContent() {
  db.all("SELECT COUNT(*) as count FROM stock", [], (err, rows) => {
    if (err) {
      logger.error("Error counting records:", err);
      return;
    }
    logger.info(`Total records in stock table: ${rows[0].count}`);

    db.all("SELECT * FROM stock ORDER BY id DESC LIMIT 1", [], (err, rows) => {
      if (err) {
        logger.error("Error querying database:", err);
        return;
      }
      logger.info("Last record in stock table:");
      console.log(JSON.stringify(rows[0], null, 2));
      db.close();
    });
  });
}

viewDbContent();