'use strict';
const fs = require('fs');

const packageManager = fs.existsSync('./yarn.lock') ? 'yarn': 'npm';

const options = require('yargs')
  .options({
    'r': {
      alias: 'report',
      default: false,
      describe: 'Show the audit report',
      type: 'boolean'
    }
  })
  .help('help')
  .argv;

const argv = require('yargs')
    .options({
      'l': {
        alias: 'low',
        default: false,
        describe: 'Exit even for low vulnerabilities',
        type: 'boolean'
      },
      'm': {
        alias: 'moderate',
        default: false,
        describe: 'Exit only when moderate or above vulnerabilities',
        type: 'boolean'
      },
      'h': {
        alias: 'high',
        default: false,
        describe: 'Exit only when high or above vulnerabilities',
        type: 'boolean'
      },
      'c': {
        alias: 'critical',
        default: true,
        describe: 'Exit only for critical vulnerabilities',
        type: 'boolean'
      },
      'r': {
        alias: 'report',
        default: false,
        describe: 'Show audit report',
        type: 'boolean'
      }
    })
    .help('help')
    .argv;

const parseMessage = (severityline, argv = {}) => {
  if (severityline.indexOf('Severity:') === -1) {
    return ''; 
  }
  const matches = severityline.match(/^(\D+|)((\d+)\D+[lL]ow|)(\D+|)((\d+)\D+[mM]oderate|)(\D+|)((\d+)\D+[hH]igh|)(\D+|)((\d+)\D+[cC]ritical|)/);
  const lowCount = parseInt(matches[3]);
  const moderateCount = parseInt(matches[6]);
  const highCount = parseInt(matches[9]);
  const criticalCount = parseInt(matches[12]);

  if (argv.critical && criticalCount > 0) {
    return 'CRITICAL';
  }

  if (argv.high && (criticalCount > 0 || highCount > 0)) {
    return 'HIGH';
  }

  if (argv.moderate && (criticalCount > 0 || highCount > 0 || moderateCount > 0)) {
    return 'MODERATE';
  }

  if (argv.low && (criticalCount > 0 || highCount > 0 || moderateCount > 0 || lowCount > 0)) {
    return 'LOW';
  }

  return '';
}

const run = () =>{
  exec(`${packageManager} audit`, function (error, stdout, stderr) {
    if (stdout) {
      if (stdout.indexOf('[+] no known vulnerabilities found') >= 0) {
        return console.log('No issues :: SUCCESS');
      }
      
      if (argv.report) {
        console.log(stdout);
      }

      const logArr = stdout.split('\n').filter(line => line);
      const severityline = logArr[logArr.length - 1];
      const severityType = parseMessage(severityline, argv);
      switch (severityType) {
        case 'CRITICAL':
        case 'HIGH':
        case 'MODERATE':
        case 'LOW':
          let message = `FAILURE :: ${severityType}`;

          if (!argv.report) {
            message = `${message} :: ${severityline}`;
          }

          console.log(message);
          process.exit(1);
          return;
        case '':      
        default:
          if (!argv.report) {
            console.log(severityline);
          }

          return;
      }
    }
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });
}

module.exports = {
  run: run,
  parseMessage: parseMessage
};
