/*
 * Copyright 2010 DotSpots, inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

// The exported API
var db;
var Database;

(function() {
	function __getBytes(str) {
		return str ? java.lang.String(str).getBytes("UTF-8") : null;
	}

	function __buildColumnPath(columnFamily, superColumn, column) {
		return org.apache.cassandra.service.ColumnPath(columnFamily,
				__getBytes(superColumn), __getBytes(column));
	}

	function __buildColumnParent(columnFamily, superColumn) {
		return org.apache.cassandra.service.ColumnParent(columnFamily,
				__getBytes(superColumn));
	}

	function __buildSliceRange(column) {
		if (column == null)
			column = {};

		var start = column.start ? __getBytes(column.start) : [];
		var end = column.end ? __getBytes(column.end) : [];
		var count = column.count ? +column.count : 100;
		return org.apache.cassandra.service
				.SliceRange(start, end, false, count);
	}

	function __buildSlicePredicate(column) {
		if (typeof column == "string")
			column = [ column ];

		if (column && column.constructor == Array) {
			return org.apache.cassandra.service.SlicePredicate(java.util.Arrays
					.asList(column.map(__getBytes)), null);
		} else {
			return org.apache.cassandra.service.SlicePredicate(null,
					__buildSliceRange(column));
		}
	}

	JSONObject = _ = function JSONObject(obj) {
		if (obj) {
			for ( var x in obj) {
				this[x] = obj[x];
			}
		}
	}

	_.prototype.toString = function() {
		var str = '';
		var first = true;
		for ( var x in this) {
			if (x != 'toString') {
				if (first) {
					first = false;
				} else {
					str += ", ";
				}
				str += x + ': ' + this[x];
			}
		}

		return '{ ' + str + ' }';
	}

	function __toColumns(rows, keys) {
		var out = new JSONObject();
		if (rows instanceof java.util.List) {
			for ( var i = 0; i < rows.size(); i++) {
				var columns = rows.get(i).columns;

				var outRow = out[rows.get(i).key] = new JSONObject();
				for ( var j = 0; j < columns.size(); j++) {
					var col = __toColumn(columns.get(j));
					for ( var x in col) {
						outRow[x] = col[x];
					}
				}
			}
		} else if (rows instanceof java.util.Map) {
			for (row in Iterator(rows.keySet())) {
				var columns = rows.get(row);

				var outRow = out[row] = new JSONObject();
				for ( var i = 0; i < columns.size(); i++) {
					var col = __toColumn(columns.get(i));
					for ( var x in col) {
						outRow[x] = col[x];
					}
				}
			}
		} else {
			// error
		}

		return out;
	}

	function __toColumn(columnOrSuperColumn) {
		var obj = new JSONObject();
		if (columnOrSuperColumn.column) {
			obj[new Bytes(columnOrSuperColumn.column.name)] = new Bytes(
					columnOrSuperColumn.column.value);
		} else {
			obj[new Bytes(columnOrSuperColumn.super_column.name)] = inner = new JSONObject();

			for ( var i = 0; i < columnOrSuperColumn.super_column.columns
					.size(); i++) {
				var col = columnOrSuperColumn.super_column.columns.get(i);
				inner[new Bytes(col.name)] = new Bytes(col.value);
			}
		}

		return obj;
	}

	Database = _ = function() {
		this.readConsistency = 1;
		this.writeConsistency = 0;
	}

	_.prototype.connect = function connect(host, port) {
		this.host = host || 'localhost';
		this.port = port || 9160;
		this._socket = org.apache.thrift.transport
				.TSocket(this.host, this.port);
		this._transport = this._socket;
		this._protocol = org.apache.thrift.protocol.TBinaryProtocol(
				this._transport, false, false)
		this._cassandra = org.apache.cassandra.service.Cassandra
				.Client(this._protocol);
		try {
			this._transport.open();
		} catch (e) {
			print('*** Failed to connect to ' + this.host + ':' + this.port);
			print('Use db.connect() to connect to the Cassandra instance')
			return;
		}
		print('Connected to ' + this.host + ':' + this.port);
		print('keyspaces: ' + this._cassandra
				.get_string_list_property("keyspaces"));
	}

	_.prototype.keyspace = function keyspace(name) {
		return new Keyspace(this, name);
	}

	_.prototype.help = function() {
		print(".connect([host], [port])");
		print(".keyspace(name)");
		print(".k(name)");
	}

	_.prototype.toString = function toString() {
		return "Database(" + this.host + ", " + this.port + ")"
	}

	_.prototype.k = _.prototype.keyspace;

	db = new Database();

	function Bytes(bytes) {
		this.bytes = bytes;
	}

	Bytes.prototype.toString = function toString() {
		return this.bytes == null ? null : java.lang
				.String(this.bytes, "UTF-8");
	}

	var SuperColumnValue = _ = function SuperColumnValue(superColumn) {
		this.name = new Bytes(superColumn.name);
		this.columns = [];
		for ( var i = 0; i < superColumn.columns.size(); i++) {
			this.columns.push(new ColumnValue(superColumn.columns.get(i)));
		}
	}

	_.prototype.toString = function toString() {
		var columns = this.columns.join(', ');
		return "{ name: " + this.name + ", columns: [ " + columns + " ] }";
	}

	var ColumnValue = _ = function ColumnValue(column) {
		this.name = new Bytes(column.name);
		this.value = new Bytes(column.value);
		this.timestamp = column.timestamp;
	}

	_.prototype.toString = function toString() {
		return "{ name: " + this.name + ", value: " + this.value
				+ ", timestamp: " + this.timestamp + " }";
	}

	var Keyspace = _ = function Keyspace(db, name) {
		this.db = db;
		this.name = name;
		this.metadata = this.db._cassandra.describe_keyspace(name);
		this.columnFamilies = {};
		for (x in Iterator(this.metadata.keySet())) {
			this.columnFamilies[x] = new ColumnFamily(this, x, this.metadata
					.get(x));
		}
	}

	_.prototype.__get = function get(key, column_family, super_column, column) {
		var parent = __buildColumnParent(column_family, super_column);

		if (key == null)
			key = {};
		else if (typeof key == "string")
			key = [ key ];

		if (key.constructor == Array) {
			// multiget_slice
			var result = this.db._cassandra.multiget_slice(this.name,
					java.util.Arrays.asList(key), parent,
					__buildSlicePredicate(column), db.readConsistency);
			return __toColumns(result, key);
		} else {
			// get_range_slice
			var start = key.start ? "" + key.start : "";
			var end = key.end ? "" + key.end : "";
			var count = key.count ? +key.count : 100;
			var result = this.db._cassandra.get_range_slice(this.name, parent,
					__buildSlicePredicate(column), start, end, count,
					db.readConsistency);

			return __toColumns(result);
		}
	}

	_.prototype.__insert = function insert(key, column_family, super_column,
			column, value) {
		var path = __buildColumnPath(column_family, super_column, column);
		this.db._cassandra.insert(this.name, key, path, __getBytes(value),
				java.lang.System.currentTimeMillis(), db.writeConsistency);
	}

	_.prototype.columnFamily = function cf(name) {
		return this.columnFamilies[name];
	}

	_.prototype.cf = _.prototype.columnFamily;

	_.prototype.help = function() {
		print(".columnFamily(name)");
		print(".cf(name)");
	}

	_.prototype.toString = function toString() {
		var str = 'Keyspace ' + this.name + '\n'
		for (x in this.columnFamilies) {
			str += this.columnFamilies[x] + '\n';
		}

		return str;
	}

	var ColumnFamily = _ = function ColumnFamily(keyspace, name, cf) {
		this.keyspace = keyspace;
		this.name = name;
		this.cf = cf;
		this.type = cf.get("Type");
		this.is_super = this.type == "Super";
	}

	_.prototype.get = function get(key, column) {
		return this.keyspace.__get(key, this.name, null, column);
	}

	_.prototype.insert = function insert(key, column, value) {
		return this.keyspace.__insert(key, this.name, null, column, value);
	}

	_.prototype.superColumn = function superColumn(name) {
		return new SuperColumn(this, name);
	}

	_.prototype.sc = _.prototype.superColumn;

	_.prototype.help = function() {
		print(".superColumn(name)");
		print(".sc(name)");
		print(".get(key, column)");
		print(".insert(key, column, value)");
	}

	_.prototype.toString = function toString() {
		return "ColumnFamily(name: " + this.name + ", type: " + this.type + ")";
	}

	var SuperColumn = _ = function SuperColumn(columnFamily, name) {
		this.columnFamily = columnFamily;
		this.name = name;
	}

	_.prototype.get = function get(key, column) {
		return this.columnFamily.keyspace.__get(key, this.columnFamily.name,
				this.name, column);
	}

	_.prototype.insert = function insert(key, column, value) {
		return this.columnFamily.keyspace.__insert(key, this.columnFamily.name,
				this.name, column, value);
	}

	_.prototype.help = function() {
		print(".get(key, column)");
		print(".insert(key, column, value)");
	}

	_.prototype.toString = function toString() {
		return "SuperColumn(name: " + this.name + ")";
	}

	print("cash - Cassandra shell")
	print('Use .help() for help on any object, start with "db.help()".');

	db.connect();

	k = db.k('Keyspace1')
	cf = k.cf('Super1')
	print(cf.get())
	// print(cf.get({}, ['super']))
	// print(cf.get({}, ['super', 'super2']))
	// print(cf.get(['key'], ['super', 'super2']))
	//
	// cf=k.cf('Standard1')
	// print(cf.get())
	// print(cf.get({}, ['dot 3']))

})()