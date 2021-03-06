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
  "io/ioutil"
  "testing"
)

func TestFieldMapping(tester *testing.T) {
	store := &ElasticEventstore{}

	json, err := ioutil.ReadFile("indexpattern_response.json")
	if err != nil {
		tester.Errorf("Unexpected error while loading test resource: %v", err)
	}
	store.cacheFieldsFromJson(string(json))

	// Exists as keyword
	actual := store.mapElasticField("ack")
	if actual != "ack.keyword" {
		tester.Errorf("expected mapped field %s but got %s", "ack.keyword", actual)
	}

	// Does not exist as valid keyword
	actual = store.mapElasticField("foo")
	if actual != "foo" {
		tester.Errorf("expected unmapped field %s but got %s", "foo", actual)
	}

	actual = store.unmapElasticField("ack.keyword")
	if actual != "ack" {
		tester.Errorf("expected unmapped field %s but got %s", "ack", actual)
	}

	actual = store.unmapElasticField("foo.keyword")
	if actual != "foo.keyword" {
		tester.Errorf("expected unmapped field %s but got %s", "foo.keyword", actual)
	}
}

func TestFieldMappingCache(tester *testing.T) {
	store := &ElasticEventstore{}

	json, err := ioutil.ReadFile("indexpattern_response.json")
	if err != nil {
		tester.Errorf("Unexpected error while loading test resource: %v", err)
	}
	store.cacheFieldsFromJson(string(json))

	ack := store.fieldDefs["ack"]
  if ack == nil {
    tester.Errorf("expected field definition")
  }
  if ack.name != "ack" {
    tester.Errorf("expected name %s but got %s", "ack", ack.name)
  }
  if ack.fieldType != "string" {
    tester.Errorf("expected fieldType %s but got %s", "string", ack.fieldType)
	}
  if ack.aggregatable != false {
    tester.Errorf("expected aggregatable %t but got %t", false, ack.aggregatable)
  }
  if ack.searchable != true {
    tester.Errorf("expected searchable %t but got %t", true, ack.searchable)
  }

	ackKeyword := store.fieldDefs["ack.keyword"]
  if ackKeyword == nil {
    tester.Errorf("expected field definition")
  }
  if ackKeyword.name != "ack.keyword" {
    tester.Errorf("expected name %s but got %s", "ackKeyword", ackKeyword.name)
  }
  if ackKeyword.fieldType != "string" {
    tester.Errorf("expected fieldType %s but got %s", "string", ackKeyword.fieldType)
	}
  if ackKeyword.aggregatable != true {
    tester.Errorf("expected aggregatable %t but got %t", true, ackKeyword.aggregatable)
  }
  if ackKeyword.searchable != true {
    tester.Errorf("expected searchable %t but got %t", true, ackKeyword.searchable)
  }
}
