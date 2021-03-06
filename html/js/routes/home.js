// Copyright 2020 Security Onion Solutions. All rights reserved.
//
// This program is distributed under the terms of version 2 of the
// GNU General Public License.  See LICENSE for further details.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

routes.push({ path: '/', name: 'home', component: {
  template: '#page-home',
  data() { return {
    i18n: this.$root.i18n,
    changeDetails: {},
  }},
  created() {
    this.loadChanges();
  },
  watch: {
  },
  methods: {
    async loadChanges() {
      try {
        let response = await axios.create().get('changes.json?v=' + Date.now());
        if (response.data) {
          this.changeDetails = response.data;
        }
      } catch (error) {
        this.$root.showError(error);
      }
    },
  }
}});
