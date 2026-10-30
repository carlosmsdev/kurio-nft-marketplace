import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

async function loadSource(path) {
    const source = readFileSync(path, 'utf8');
    const output = ts.transpileModule(source, {
        fileName: path,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { toWei, fromWei } = await loadSource('./src/lib/eth.ts');
assert.equal(toWei('0.1') + toWei('0.2'), toWei('0.3'));
assert.equal(fromWei(toWei('1.234567890123456789')), '1.234567890123456789');
assert.equal(fromWei(toWei('1.19') * 3n), '3.57');
assert.equal(fromWei(toWei('1.19') / 10n), '0.119');
assert.throws(() => toWei('-0.1'));
assert.throws(() => toWei('0.1234567890123456789'));

const { seed, getUser, cartOwner, migrateNftImages } = await loadSource('./src/mocks/db.ts');
const db = seed();
assert.ok(db.nfts.length >= 12);
assert.equal(cartOwner(db), 'guest');
db.sessionId = 'demo';
db.sessionExpiresAt = Date.now() + 10000;
assert.equal(getUser(db)?.id, 'demo');
assert.equal(cartOwner(db), 'demo');
db.sessionExpiresAt = 0;
assert.equal(getUser(db), undefined);
assert.equal(cartOwner(db), 'guest');
const savedState = seed();
savedState.nfts[1].image = '/nft-2.png';
savedState.nfts[2].image = '/nft-3.png';
savedState.nfts[3].image = '/nft-2.png';
savedState.favorites.demo = ['2'];
savedState.carts.guest = [{ nftId: '3', quantity: 1 }];
assert.equal(migrateNftImages(savedState), true);
assert.equal(savedState.nfts[1].image, '/nft-2.webp');
assert.equal(savedState.nfts[2].image, '/nft-3.webp');
assert.equal(savedState.nfts[3].image, '/nft-2.webp');
assert.deepEqual(savedState.favorites.demo, ['2']);
assert.deepEqual(savedState.carts.guest, [{ nftId: '3', quantity: 1 }]);
assert.equal(migrateNftImages(savedState), false);
console.log('Core checks passed: ETH precision, seeded catalog, session isolation/expiry, image migration.');
