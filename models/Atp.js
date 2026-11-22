const mongoose = require('mongoose');

const atpSchema = new mongoose.Schema({
  brandId: String,
  plant: String,
  crossPlantConfigurableMaterial: String,
  style: String,
  materialNumberId: String,
  materialNumberText: String,
  colorNrfColorCode: String,
  characteristicValueForMainSizesOfVariantsId: String,
  fashionInformationField1: String,
  hs2ProductCategory: String,
  brandTerritory: String,
  lastSeasonYearSeasonEMEA: String,
  lotLogoFullbleedDesktop: String,
  atpCurrentWeek30plus: Number
});

atpSchema.index({ materialNumberId: 1 });

// Collection name is 'atps' (Mongoose pluralizes and lowercases the model name).
module.exports = mongoose.model('Atp', atpSchema);
