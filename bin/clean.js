#!/usr/bin/env node

/**
 * Remove all traces of WebTorrent Desktop from the system (config and temp files).
 * Useful for developers.
 */

var fs = require('fs')
var os = require('os')
var path = require('path')
var rimraf = require('rimraf')

var config = require('../config')
var handlers = require('../main/handlers')

rimraf.sync(config.CONFIG_PATH)

var tmpPath
try {
  tmpPath = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent')
} catch (err) {
  tmpPath = path.join(os.tmpDir(), 'webtorrent')
}
rimraf.sync(tmpPath)

// Uninstall .torrent file and magnet link handlers
handlers.uninstall()
