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

// The collection name is determined by the first argument passed to mongoose.model(). In this case, it's 'Atp'.
// Mongoose automatically pluralizes and lowercases the model name to create the collection name. So, the model 'Atp' will correspond to a collection named 'atps' in MongoDB.
// If you want to specify a different collection name, you can do so by passing a third argument to mongoose.model(). For example:


module.exports = mongoose.model('Atp', atpSchema);
