#!/usr/bin/env node
import * as commander from 'commander';
import * as spawn from 'cross-spawn';
import * as chalk from 'chalk';
import * as Path from 'path';

const packageJson = require('../package.json');
const alcor = new commander.Command(packageJson.name);

alcor
    .version(packageJson.version)
    .on('--help', () => {
        console.log(
            `If you have any problems, do not hesitate to file an issue:`
        );
        console.log(
            `      ${chalk.cyan(
                'https://github.com/amwenjie/mizar-tool/issues/new'
            )}`
        );
        console.log();
    });

alcor
    .command('build')
    .description('build the project')
    .usage(`build [options]`)
    .option('-d, --debug', 'development mode watch files change')
    .option('-s, --server', 'run a development server')
    .option('-p, --publish', 'publish the package')
    .option('--verbose', 'print additional logs')
    .allowUnknownOption()
    .action(options => {
        const command = 'node';
        const args = [
            Path.resolve(__dirname, '../tools/ProjectBuild'),
        ];
        if (options.debug) {
            args.push('--watch');
        }
        if (options.server) {
            args.push('--runServer');
        }
        if (options.publish) {
            args.push('--publish');
        }
        if (options.verbose) {
            args.push('--verbose')
        }
        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('close', code => {
            if (code !== 0) {
                console.error(`${command} raised an error, code: ${code}`);
            }
        });
    });

alcor
    .command('pack')
    .description('pack the pakcage')
    .usage(`pack [options]`)
    .option('-p, --publish', 'publish the package')
    .option('--verbose', 'print additional logs')
    .allowUnknownOption()
    .action(options => {
        const command = 'node';
        const args = [
            Path.resolve(__dirname, '../tools/PackageBuild'),
        ];
        if (options.publish) {
            args.push('--publish');
        }
        if (options.verbose) {
            args.push('--verbose')
        }
        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('close', code => {
            if (code !== 0) {
                console.error(`${command} raised an error, code: ${code}`);
            }
        });
    });

alcor
    .command('create')
    .description('create a mizar app')
    .arguments('<project-directory>')
    .usage(`create ${chalk.green('<project-directory>')} [options]`)
    .option('--verbose', 'print additional logs')
    .option('--info', 'print environment debug info')
    .option('--use-yarn')
    .option('--use-pnp')
    .allowUnknownOption()
    .action((name, options) => {
        const command = 'node';
        const args = [
            Path.resolve(__dirname, '../tools/CreateApp'),
        ];
        if (name) {
            args.push(name);
        }
        if (options.verbose) {
            args.push('--verbose');
        }
        if (options.info) {
            args.push('--info');
        }
        if (options.useYarn) {
            args.push('--use-yarn');
        }
        if (options.usePnp) {
            args.push('--use-pnp');
        }
        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('close', code => {
            if (code !== 0) {
                console.error(`${command} raised an error, code: ${code}`);
            }
        });
    });
// alcor.addCommand(makeCreateAppCommand());
    
alcor.parse(process.argv);