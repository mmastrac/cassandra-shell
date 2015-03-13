Javascript-language shell around the Apache Cassandra key-value store.

# Features

  * Range/slices queries in one get() method
  * Data insertion
  * Basic metadata support
  * Supports Cassandra 0.5

# What's missing

  * Deleting data
  * Cassandra 0.6 API support
  * Batch inserts
  * Support for non-string datatypes (as best as it can)
  * Exposing the column timestamp
  * Row queries as lists to maintain key order

## Getting Started

Download the latest version of the pre-built shell and run it from the command-line. It will automatically connect to a Cassandra instance on localhost:9160.

    # java -jar cash-0.01.jar
    cash - Cassandra shell
    Use .help() for help on any object, start with "db.help()".
    Connected to localhost:9160
    keyspaces: [Keyspace1, system]
    Rhino 1.7 release 2 2009 03 22
    js> 

To connect with a remote instance, use db.connect() and pass a hostname (the port will default to 9160 if not specified):

    js> db.connect('otherhost', 9160)
    Connected to otherhost:9160
    keyspaces: [Keyspace1, system]

# Help

Basic help is available from any object in the system:

    js> db.help()
    .connect([host], [port])
    .keyspace(name)
    .k(name)

# Navigation

You can start navigating your Cassandra store by using the global db object. A keyspace may be retrieved via a call to db.keyspace() (db.k is a shortcut for this function):

    js> k = db.k('Keyspace1')
    Keyspace Keyspace1
    ColumnFamily(name: StandardByUUID1, type: Standard)
    ColumnFamily(name: Super1, type: Super)
    ColumnFamily(name: Standard2, type: Standard)
    ColumnFamily(name: Standard1, type: Standard)

From a keyspace, you can then retrieve a column family via keyspace.columnFamily() (keyspace.cf is a shortcut for this function):

    js> cf = k.cf('Super1')
    ColumnFamily(name: Super1, type: Super)

# Querying

You can query directly from a column family, or in the case of a super-column family, retrieve a super column via columnFamily.superColumn() (columnFamily.sc for short) and query from there:

    js> cf.get()
    { key: { super: { col: value, col2: value2 }, super2: { col: value } } }
    js> cf.sc('super').get() 
    { key: { col: value, col2: value2 } }

The get() method on a column family or super-column takes two parameters: the key specification and the column specification. If either is omitted or null, it is inferred to mean "all keys" or "all columns".

Keys may be specified as a string, array of strings or a key range object. A key range object may specify start, end and/or count:

|| `'key'` || Query for a single key ||
|| `['key1', 'key2']` || Query for a two keys ||
|| `{start: 'start', end: 'end', count: count}` || Query for a key range ||

    js> cf.get('key')
    js> cf.get(['key1', 'key2'])
    js> cf.get({start:'key2', end:'key1'})
    js> cf.get({start:'key2', count: 100})

Columns may be specified as a string, array of strings or a column range object. A column range may specify start, end and/or count:

| | |
|----|-----|
| `'col'` | Query for a single column |
| `['col1', 'col2']` | Query for a two columns |
| `{start: 'start', end: 'end', count: count}` | Query for a column range |

# Examples

    js> cf.get('key', 'col')
    js> cf.get('key', ['col1', 'col2'])
    js> cf.get('key', {start:'col1', end:'col2'})
    js> cf.get('key', {start:'col1', count: 100})


You can mix and match key and column specifications as well:

*NOTE*: The `count` property of key and column ranges behaves differently (a property of Cassandra's API). 

  * For keys, this specifies the number of contiguous keys to retrieve, whether or not they match the column specification.  This means that a range with `count` = 20 could retrieve 20 empty rows if none of them match the column specification.
  * For columns, this specifies the maximum number of matching columns to retrieve per key.  This means that a range with `count` = 20 could retrieve different sets of columns per row. 

    js> cf.get(['key1', 'key2'], ['col1', 'col2'])
    js> cf.get({start:'key2', end:'key1'}, {start:'col1', end:'col2'})

# Inserting

You can insert into a column family or super-column using the insert function. insert() must be called from the correct type of object depending on the type of column family:

    js> db.k('Keyspace1').cf('Standard1').insert('key5', 'col1', 'value')
    js> db.k('Keyspace1').cf('Standard1').get('key5')
    { key5: { col1: value } }
    js> db.k('Keyspace1').cf('Super1').sc('super').insert('key10', 'col1', 'value')
    js> db.k('Keyspace1').cf('Super1').sc('super').get('key10')
    { key10: { col1: value } }

# Hacking

The source is licensed under the Apache License 2.0.  Feel free to fork, steal, crib or mangle as needed.

The shell is implemented as a single JS file, db.js, which is bootstrapped into a Rhino shell.  

