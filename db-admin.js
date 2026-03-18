#!/usr/bin/env node
import { Command } from 'commander';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('db-admin')
  .description('データベース管理ツール')
  .version('1.0.0');

// ユーザー一覧表示
program
  .command('list-users')
  .description('全ユーザーを表示')
  .option('-r, --remote', '本番環境のデータベースを使用')
  .action((options) => {
    const env = options.remote ? '--remote' : '--local';
    console.log('\n📋 ユーザー一覧を取得中...\n');
    const cmd = `npx wrangler d1 execute webapp-production ${env} --command="SELECT id, login_id, name, created_at FROM users ORDER BY id"`;
    console.log(`実行コマンド: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit' });
  });

// CSVデータ件数表示
program
  .command('count-csv')
  .description('ユーザーごとのCSVデータ件数を表示')
  .option('-r, --remote', '本番環境のデータベースを使用')
  .action((options) => {
    const env = options.remote ? '--remote' : '--local';
    console.log('\n📊 CSVデータ件数を取得中...\n');
    const cmd = `npx wrangler d1 execute webapp-production ${env} --command="SELECT u.id, u.login_id, u.name, COUNT(c.id) as csv_count FROM users u LEFT JOIN csv_data c ON u.id = c.user_id GROUP BY u.id ORDER BY u.id"`;
    console.log(`実行コマンド: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit' });
  });

// 特定ユーザーのCSVデータ表示
program
  .command('show-csv <login_id>')
  .description('特定ユーザーのCSVデータを表示')
  .option('-r, --remote', '本番環境のデータベースを使用')
  .option('-l, --limit <number>', '表示件数', '10')
  .action((login_id, options) => {
    const env = options.remote ? '--remote' : '--local';
    const limit = options.limit;
    console.log(`\n📄 ${login_id} のCSVデータ（最大${limit}件）を取得中...\n`);
    const cmd = `npx wrangler d1 execute webapp-production ${env} --command="SELECT c.id, c.row_number, c.row_data, c.created_at FROM csv_data c JOIN users u ON c.user_id = u.id WHERE u.login_id = '${login_id}' ORDER BY c.row_number LIMIT ${limit}"`;
    console.log(`実行コマンド: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit' });
  });

// 特定ユーザーのCSVデータ削除
program
  .command('delete-csv <login_id>')
  .description('特定ユーザーのCSVデータを削除')
  .option('-r, --remote', '本番環境のデータベースを使用')
  .action((login_id, options) => {
    const env = options.remote ? '--remote' : '--local';
    console.log(`\n⚠️  警告: ${login_id} の全CSVデータを削除します！\n`);
    const cmd = `npx wrangler d1 execute webapp-production ${env} --command="DELETE FROM csv_data WHERE user_id = (SELECT id FROM users WHERE login_id = '${login_id}')"`;
    console.log(`実行コマンド: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✅ 削除完了\n');
  });

// エクスポート設定表示
program
  .command('show-settings <login_id>')
  .description('特定ユーザーのエクスポート設定を表示')
  .option('-r, --remote', '本番環境のデータベースを使用')
  .action((login_id, options) => {
    const env = options.remote ? '--remote' : '--local';
    console.log(`\n⚙️  ${login_id} のエクスポート設定を取得中...\n`);
    const cmd = `npx wrangler d1 execute webapp-production ${env} --command="SELECT s.export_type, s.button_name, s.file_prefix, s.columns, s.filter_column, s.filter_value, s.sort_column FROM export_settings s JOIN users u ON s.user_id = u.id WHERE u.login_id = '${login_id}' ORDER BY s.export_type"`;
    console.log(`実行コマンド: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit' });
  });

// SQLコマンド実行
program
  .command('sql <query>')
  .description('任意のSQLクエリを実行')
  .option('-r, --remote', '本番環境のデータベースを使用')
  .action((query, options) => {
    const env = options.remote ? '--remote' : '--local';
    console.log('\n🔍 SQLクエリを実行中...\n');
    const cmd = `npx wrangler d1 execute webapp-production ${env} --command="${query}"`;
    console.log(`実行コマンド: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit' });
  });

program.parse();
