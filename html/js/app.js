// Copyright 2019 Jason Ertel (jertel). All rights reserved.
//
// This program is distributed under the terms of version 2 of the
// GNU General Public License.  See LICENSE for further details.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
const routes = [];

$(document).ready(function() {
  new Vue({
    el: '#app',
    vuetify: new Vuetify({
      icons: {
        iconfont: 'fa',
      },
      theme: {
        dark: true,
        options: {
          customProperties: true,
        },
        themes: {
          light: {
            nav_background: '#12110d',
            nav: '#ffffff',
            drawer_background: '#f7f7f1',
            background: '#ffffff',
          },
          dark: {
            nav_background: '#12110d',
            nav: '#ffffff',
            drawer_background: '#35342b',
            background: '#1e1e1e',
          },
        },
      },
    }),
    router: new VueRouter({ routes }),
    data: {
      timestamp: Date.now(),
      i18n: i18n.getLocalizedTranslations(navigator.language),
      loading: false,
      error: false,
      info: false,
      errorMessage: "",
      infoMessage: "",
      toolbar: null,
      wsUrl: (location.protocol == 'https:' ?  'wss://' : 'ws://') + location.host + location.pathname + 'ws',
      apiUrl: location.origin + location.pathname + 'api/',
      authUrl: '/auth/self-service/browser/flows/',
      version: '0.0.0',
      papi: null,
      connectionTimeout: 300000,
      socket: null,
      subscriptions: [],
      parameters: {},
      parametersLoaded: false,
      parameterCallback: null,
      parameterSection: null,
      chartsInitialized: false,
    },
    watch: {
      '$vuetify.theme.dark': 'saveLocalSettings',
    },
    methods: {
      log(msg) {
        console.log(moment().format() + " | " + msg);
      },
      redirectIfAuthCompleted() {
        if (!location.pathname.startsWith("/login")) {
          destUri = this.getCookie("AUTH_REDIRECT");
          if (destUri && destUri != "/") {
            this.log("Redirecting to auth destination: " + destUri);
            this.deleteCookie("AUTH_REDIRECT");
            location.pathname = destUri;
            return true;
          }
        }
        return false;
      },
      async loadServerSettings() {
        if (document.getElementById("version")) {
          try {
            const response = await this.papi.get('info');
            this.version = response.data.version;
            this.license = response.data.license;
            this.parameters = response.data.parameters;

            if (this.parameterCallback != null) {
              this.parameterCallback(this.parameters[this.parameterSection]);
              this.parameterCallback = null;
            }
            this.parametersLoaded = true;
          } catch (error) {
            this.showError(error);
          }
        }
      },
      loadParameters(section, callback) {
        if (this.parametersLoaded) {
          callback(this.parameters[section])
        } else {
          this.parameterSection = section;
          this.parameterCallback = callback;
        }
      },
      toggleTheme() {
        this.$vuetify.theme.dark = !this.$vuetify.theme.dark
        this.timestamp=Date.now();
      },
      drawAttention(elementId) {
        var element = $(elementId);
        element.removeClass('waggle');
        setTimeout(function() {
          element.addClass('waggle');
        }, 100);
      },
      makeHeader(label, value) {
        return { text: label, value: value };
      },
      formatDateTime(date) {
        return this.formatDate(date, this.i18n.dateTimeFormat, this.i18n.dateUnknown);
      },
      formatTimestamp(date) {
        return this.formatDate(date, this.i18n.timestampFormat, this.i18n.dateUnknown);
      },
      formatTimelineLabel(date) {
        return this.formatDate(date, this.i18n.timelineFormat, date);
      },
      formatDate(date, format, dflt) {
        var formatted = dflt;
        if (date) {
          const dateObj = moment(String(date));
          if (dateObj.isAfter('1000-01-01')) {
            formatted = dateObj.format(format);
          }
        }
        return formatted;
      },
      formatDuration(duration) {
        if (duration) {
          return moment.duration(duration,"s").humanize();
        }
      },
      showError(msg) {
        this.error = true;
        var localized = this.i18n[msg];
        if (!localized) {
          if (msg.response && msg.response.data) {
            localized = this.i18n[msg.response.data];
            if (!localized) {
              var details = msg.response.data;
              if (details.length > 200) {
                details = details.substring(0, 200);
              }
              localized = msg + " (" + details + ")";
            }
          } else {
            localized = msg;
          }
        }
        this.errorMessage = localized;
      },
      showInfo(msg) {
        this.info = true;
        this.infoMessage = msg;
      },
      startLoading() {
        this.loading = true;
        this.error = false;
        this.info = false;
      },
      stopLoading() {
        this.loading = false;
      },
      saveLocalSettings() {
        localStorage['settings.app.dark'] = this.$vuetify.theme.dark;
      },
      loadLocalSettings() {
        if (localStorage['settings.app.dark'] != undefined) {
          this.$vuetify.theme.dark = localStorage['settings.app.dark'] == "true";
        }
      },
      subscribe(kind, fn) {
        this.ensureConnected();
        var list = this.subscriptions[kind];
        if (list == undefined) {
          list = [];
          this.subscriptions[kind] = list;
        }
        if (list.indexOf(fn) == -1) {
          list.push(fn);
        }
      },
      unsubscribe(kind, fn) {
        var list = this.subscriptions[kind];
        if (list != undefined) {
          var idx = list.indexOf(fn);
          if (idx > -1) {
            list.splice(idx, 1);
          }
        }
      },
      publish(kind, obj) {
        var listeners = this.subscriptions[kind];
        if (listeners) {
          listeners.forEach(function(listener) {
            listener(obj);
          });
        }
      },
      ensureConnected() {
        if (this.socket == null) {
          this.openWebsocket();
          window.setInterval(this.openWebsocket, this.connectionTimeout);    
        }
      },
      openWebsocket() {
        if (this.socket == null || this.socket.readyState == WebSocket.CLOSED) {
          const vm = this;
          this.log("WebSocket connecting to " + this.wsUrl);
          this.socket = new WebSocket(this.wsUrl);
          this.socket.onopen = function(evt) {
            vm.log("WebSocket connected");
          };
          this.socket.onclose = function(evt) {
            vm.log("WebSocket closed, will attempt to reconnect");
            vm.socket = null;
          };
          this.socket.onmessage = function(evt) {
            var msg = JSON.parse(evt.data);
            vm.publish(msg.Kind, msg.Object);
          };
          this.socket.onerror = function(evt) {
            vm.log("WebSocket failure: " + evt.data);
          };
        }
      },
      showLogin() {
        location.href = this.authUrl + "login";
      },
      apiSuccessCallback(response) {
        return response;
      },
      apiFailureCallback(error) {
        if (error.response && error.response.status === 401) {
          this.showLogin();
        }
        throw error;
      },
      setupApi() {
        this.papi = axios.create({
          baseURL: this.apiUrl,
          timeout: this.connectionTimeout,
        });
        this.papi.interceptors.response.use(this.apiSuccessCallback, this.apiFailureCallback);
      },
      setupAuth() {
        this.authApi = axios.create({
          baseURL: this.authUrl,
          timeout: this.connectionTimeout,
          withCredentials: true,
        });
      },
      setCookie(name, value, ageSecs) {
        let maxAge = "";
        if (ageSecs) {
          maxAge = ";Max-Age=" + ageSecs;
        }
        document.cookie = name + "=" + value + maxAge + ";Path=/";
      },
      getCookie(name) {
        let cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            let pair = cookie.split("=", 2);
            if (pair.length == 2 && pair[0] == name) {
              return pair[1];
            }
        }
        return null;
      },
      deleteCookie(name) {
        this.setCookie(name, "", -1);
      },
      registerChart(chartType, chartName) {
        var app = this;
        Vue.component(chartName, {
          extends: chartType,
          props: {
            chartdata: { type: Object },
            options: { type: Object }
          },
          mounted () {
            this.renderChart(this.chartdata, this.options)
            this.chartdata.obj = this;
          }
        })
      },
      initializeCharts() {
        if (this.chartsInitialized) return;
        this.registerChart(VueChartJs.Bar, 'bar-chart'); 
        this.registerChart(VueChartJs.Line, 'line-chart');
        this.chartsInitialized = true; 
      },
      getColor(colorName, percent = 0) {
        percent = this.$root.$vuetify.theme.dark ? percent * -1 : percent;
        var color = this.$root.$vuetify.theme.currentTheme[colorName];
        if (!color) {
          color = colorName;
        }
        var R = parseInt(color.substring(1,3),16);
        var G = parseInt(color.substring(3,5),16);
        var B = parseInt(color.substring(5,7),16);
    
        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);
    
        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255;  
    
        var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
        
        return "#"+RR+GG+BB;
      }
    },
    created() {
      this.log("Initializing application components");
      if (this.redirectIfAuthCompleted()) return;
      this.setupApi();
      this.setupAuth();
      this.loadServerSettings();
      this.loadLocalSettings();
      Vue.filter('formatDateTime', this.formatDateTime);
      Vue.filter('formatDuration', this.formatDuration);
      Vue.filter('formatTimestamp', this.formatTimestamp);
      $('#app')[0].style.display = "block";
      this.log("Initialization complete");
    },
  });
});
