#! /usr/bin/env node
import { cyan, green } from 'colorette';
import { Command } from 'commander';
import spawn from 'cross-spawn';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
import packageJson from '../package.json' with {type: 'json'};
const alcor = new Command(packageJson.name);

alcor
    .version(packageJson.version)
    .on('--help', () => {
        console.log(
            `If you have any problems, do not hesitate to file an issue:`
        );
        console.log(
            `      ${cyan(
                'https://github.com/amwenjie/mizar-tool/issues/new'
            )}`
        );
        console.log();
    });

alcor
    .command('build')
    .description('build the project')
    .usage(`build [options]`)
    .option('-d, --debug', 'development mode')
    .option('-w, --watch', 'watch files change')
    .option('-s, --server', 'run a development server')
    .option('-h, --hotReload', 'hot reload web page in development mode')
    .option('--ost', 'only compile ./src/standalone/* files out as independent IIFE files')
    .option('--verbose', 'print additional logs')
    .option('--analyz', 'generate stats file, open analyz server on debug mode')
    .option('--notify', 'show a native notification on macOS, Windows, Linux')
    .allowUnknownOption()
    .action(options => {
        const command = 'node';
        const args = [
            path.resolve(import.meta.dirname, '../tools/ProjectBuild'),
        ];
        if (options.debug) {
            args.push('--debug');
        }
        if (options.watch) {
            args.push('--watch');
        }
        if (options.server) {
            args.push('--runServer');
        }
        if (options.hotReload) {
            args.push('--hotReload');
        }
        if (options.ost) {
            args.push('--onlystandalone');
        }
        if (options.analyz) {
            args.push('--analyz');
        }
        if (options.verbose) {
            args.push('--verbose')
        }
        if (options.notify) {
            args.push('--notify')
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
    .description('compile ./src directory out as a package')
    .usage(`pack [options]`)
    .option('-d, --debug', 'development mode')
    .option('-w, --watch', 'watch files change')
    .option('-p, --publish', 'publish the package')
    .option('--verbose', 'print additional logs')
    .allowUnknownOption()
    .action(options => {
        const command = 'node';
        const args = [
            path.resolve(import.meta.dirname, '../tools/PackageBuild'),
        ];
        if (options.debug) {
            args.push('--debug');
        }
        if (options.watch) {
            args.push('--watch');
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
    .command('create')
    .description('create a mizar app')
    .arguments('<project-directory>')
    .usage(`create ${green('<project-directory>')} [options]`)
    .option('--verbose', 'print additional logs')
    .option('--info', 'print environment debug info')
    .option('--use-yarn')
    .option('--use-pnp')
    .allowUnknownOption()
    .action((name, options) => {
        const command = 'node';
        const args = [
            path.resolve(import.meta.dirname, '../tools/CreateApp'),
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

alcor.parse(process.argv);