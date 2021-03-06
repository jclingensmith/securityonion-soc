// Copyright 2019 Jason Ertel (jertel). All rights reserved.
//
// This program is distributed under the terms of version 2 of the
// GNU General Public License.  See LICENSE for further details.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

package elastic

import (
  "net/http"
  "testing"
  "time"
  "github.com/security-onion-solutions/securityonion-soc/module"
)

func TestElasticInit(tester *testing.T) {
  elastic := NewElastic(nil)
  cfg := make(module.ModuleConfig)
  err := elastic.Init(cfg)
  if err != nil {
    tester.Errorf("unexpected Init error: %s", err)
  }
  if len(elastic.store.esConfig.Addresses) != 1 || elastic.store.esConfig.Addresses[0] != "elasticsearch" {
    tester.Errorf("expected host %s but got %s", "elasticsearch", elastic.store.esConfig.Addresses)
  }
  if elastic.store.esConfig.Transport.(*http.Transport).TLSClientConfig.InsecureSkipVerify != false {
    tester.Errorf("expected verifyCert %t but got %t", false, elastic.store.esConfig.Transport.(*http.Transport).TLSClientConfig.InsecureSkipVerify)
  }
  if elastic.store.esConfig.Username != "" {
    tester.Errorf("expected username %s but got %s", "", elastic.store.esConfig.Username)
  }
  if elastic.store.esConfig.Password != "" {
    tester.Errorf("expected password %s but got %s", "", elastic.store.esConfig.Password)
  }
  if elastic.store.timeShiftMs != DEFAULT_TIME_SHIFT_MS {
    tester.Errorf("expected timeShiftMs %d but got %d", DEFAULT_TIME_SHIFT_MS, elastic.store.timeShiftMs)
  }
  if elastic.store.timeoutMs != time.Duration(DEFAULT_TIMEOUT_MS) * time.Millisecond {
    tester.Errorf("expected timeoutMs %d but got %d", DEFAULT_TIMEOUT_MS, elastic.store.timeoutMs)
  }
  if elastic.store.cacheMs != time.Duration(DEFAULT_CACHE_MS) * time.Millisecond {
    tester.Errorf("expected cacheMs %d but got %d", DEFAULT_CACHE_MS, elastic.store.cacheMs)
  }
  if elastic.store.index != DEFAULT_INDEX {
    tester.Errorf("expected index %s but got %s", DEFAULT_INDEX, elastic.store.esConfig.Addresses)
  }
}
