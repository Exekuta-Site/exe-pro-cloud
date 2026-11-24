'use strict';

class WordPressAutomation {
  constructor(db) {
    this.db = db;
  }

  async siteOffline(site) {
    return {
      event: 'website.offline',
      site_id: site.site_id,
      status: 'queued'
    };
  }
}

module.exports = WordPressAutomation;
