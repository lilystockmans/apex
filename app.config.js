const base = require('./app.json');
module.exports = {
  ...base.expo,
  extra: {
    // Add API keys here in future phases, e.g.:
    // supabaseUrl: process.env.SUPABASE_URL ?? '',
  },
};
