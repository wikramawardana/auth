import assert from "node:assert/strict";
import test from "node:test";
import {
	canSyncTuwagaRoles,
	isTuwagaRole,
	parseClientCredentials,
	roleSyncClientIds,
} from "../src/lib/tuwaga-role-policy.ts";

const credentials = { clientId: "tuwaga-test", clientSecret: "test-secret" };
const client = { ...credentials, disabled: false, type: "web" };
test("only the allowlisted confidential client can sync app roles", () => {
	assert.equal(
		canSyncTuwagaRoles(client, credentials, [client.clientId]),
		true,
	);
	assert.equal(canSyncTuwagaRoles(client, credentials, ["another-app"]), false);
	assert.equal(
		canSyncTuwagaRoles({ ...client, disabled: true }, credentials, [
			client.clientId,
		]),
		false,
	);
	assert.equal(
		canSyncTuwagaRoles({ ...client, type: "public" }, credentials, [
			client.clientId,
		]),
		false,
	);
	assert.equal(
		canSyncTuwagaRoles(client, { ...credentials, clientSecret: "wrong" }, [
			client.clientId,
		]),
		false,
	);
});
test("credentials and EO role are validated strictly", () => {
	const header = `Basic ${Buffer.from("tuwaga-test:test-secret").toString("base64")}`;
	assert.deepEqual(parseClientCredentials(header), credentials);
	for (const invalid of [null, "Bearer token", "Basic !!!", "Basic Og=="])
		assert.equal(parseClientCredentials(invalid), null);
	assert.equal(isTuwagaRole("eo"), true);
	for (const role of ["referee", "EO", "admin,eo", null])
		assert.equal(isTuwagaRole(role), false);
	assert.deepEqual(roleSyncClientIds("one, two"), ["one", "two"]);
});
