const base = require('./app.json');
module.exports = {
  ...base.expo,
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
};
