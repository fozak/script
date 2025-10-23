
//#region src/lib/util/Logger.ts
const mkLog = (namespace) => (...s) => console.log(`[${namespace}]`, ...s.map((p) => {
	if (typeof p === "object") return JSON.stringify(p, null, 2);
	return p;
}));
const dbg = (...args) => console.log(args);
const interpolateString = (template, dict) => {
	return template.replace(/\{\$(\w+)\}/g, (match, key) => {
		dbg({
			match,
			key
		});
		const lowerKey = key.toLowerCase();
		return dict.hasOwnProperty(lowerKey) ? dict[lowerKey] || "" : match;
	});
};

//#endregion
//#region src/lib/util/versions.ts
const versions = require(`${__hooks}/versions.cjs`);

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceCreate.ts
const HandleInstanceCreate = (c) => {
	const dao = $app.dao();
	const log = mkLog(`POST:instance`);
	const authRecord = c.get("authRecord");
	log(`authRecord`, JSON.stringify(authRecord));
	if (!authRecord) throw new Error(`Expected authRecord here`);
	log(`TOP OF POST`);
	let data = new DynamicModel({
		subdomain: "",
		version: versions[0],
		region: "sfo-2"
	});
	log(`before bind`);
	c.bind(data);
	log(`after bind`);
	data = JSON.parse(JSON.stringify(data));
	const { subdomain, version, region } = data;
	log(`vars`, JSON.stringify({
		subdomain,
		region
	}));
	if (!subdomain) throw new BadRequestError(`Subdomain is required when creating an instance.`);
	const collection = dao.findCollectionByNameOrId("instances");
	const record = new Record(collection);
	record.set("uid", authRecord.getId());
	record.set("region", region || `sfo-1`);
	record.set("subdomain", subdomain);
	record.set("power", true);
	record.set("status", "idle");
	record.set("version", version);
	record.set("dev", true);
	record.set("syncAdmin", true);
	const form = new RecordUpsertForm($app, record);
	form.submit();
	return c.json(200, { instance: record });
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceDelete.ts
const HandleInstanceDelete = (c) => {
	const dao = $app.dao();
	const log = mkLog(`DELETE:instance`);
	log(`TOP OF DELETE`);
	let data = new DynamicModel({ id: "" });
	c.bind(data);
	log(`After bind`);
	data = JSON.parse(JSON.stringify(data));
	const id = c.pathParam("id");
	log(`vars`, JSON.stringify({ id }));
	const authRecord = c.get("authRecord");
	log(`authRecord`, JSON.stringify(authRecord));
	if (!authRecord) throw new BadRequestError(`Expected authRecord here`);
	const record = dao.findRecordById("instances", id);
	if (!record) throw new BadRequestError(`Instance ${id} not found.`);
	if (record.get("uid") !== authRecord.id) throw new BadRequestError(`Not authorized`);
	if (record.getString("status").toLowerCase() !== "idle") throw new BadRequestError(`Instance must be shut down first.`);
	const path = [$os.getenv("DATA_ROOT"), id].join("/");
	log(`path ${path}`);
	const res = $os.removeAll(path);
	log(`res`, res);
	dao.deleteRecord(record);
	return c.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceResolve.ts
const HandleInstanceResolve = (c) => {
	const dao = $app.dao();
	const log = mkLog(`GET:instance/resolve`);
	log(`TOP OF GET`);
	const host = c.queryParam("host");
	if (!host) throw new BadRequestError(`Host is required when resolving an instance.`);
	const instance = (() => {
		try {
			log(`Checking for cname ${host}`);
			const record = $app.dao().findFirstRecordByData("instances", "cname", host);
			return record;
		} catch (e) {
			log(`${host} is not a cname`);
		}
		const [subdomain, ...junk] = host.split(".");
		if (!subdomain) throw new BadRequestError(`Subdomain or instance ID is required when resolving an instance without a cname.`);
		try {
			log(`Checking for instance ID ${subdomain}`);
			const record = $app.dao().findRecordById("instances", subdomain);
			return record;
		} catch (e) {
			log(`${subdomain} is not an instance ID`);
		}
		try {
			log(`Checking for subdomain ${subdomain}`);
			const record = $app.dao().findFirstRecordByData("instances", `subdomain`, subdomain);
			return record;
		} catch (e) {
			log(`${subdomain} is not a subdomain`);
		}
		throw new BadRequestError(`Instance not found.`);
	})();
	log(`Checking for instance suspension`);
	if (instance.get("suspension")) throw new BadRequestError(instance.get("suspension"));
	const APP_URL = (...path) => [$os.getenv("APP_URL"), ...path].join("/");
	const DOC_URL = (...path) => APP_URL("docs", ...path);
	log(`Checking for power`);
	if (!instance.getBool("power")) throw new BadRequestError(`This instance is powered off. See ${DOC_URL(`power`)} for more information.`);
	const user = (() => {
		const userId = instance.get("uid");
		if (!userId) throw new BadRequestError(`Instance has no user.`);
		try {
			log(`Checking for user ${userId}`);
			const record = $app.dao().findRecordById("users", userId);
			return record;
		} catch (e) {
			log(`User ${userId} not found`);
		}
		throw new BadRequestError(`User not found.`);
	})();
	log(`Checking for user suspension`);
	if (user.get("suspension")) throw new BadRequestError(user.get("suspension"));
	log(`Checking for active instances`);
	if (user.getInt("subscription_quantity") === 0) throw new BadRequestError(`Instances will not run until you <a href=${APP_URL(`access`)}>upgrade</a>.`);
	log(`Checking for verified account`);
	if (!user.getBool("verified")) throw new BadRequestError(`Log in at ${APP_URL()} to verify your account.`);
	const tokenKey = user.getString("tokenKey");
	const passwordHash = user.getString("passwordHash");
	const email = user.getString("email");
	const userJSON = JSON.parse(JSON.stringify(user));
	const ret = {
		instance,
		user: {
			...userJSON,
			tokenKey,
			passwordHash,
			email
		}
	};
	log(`Returning instance and user`, ret);
	return c.json(200, ret);
};

//#endregion
//#region ../../../../node_modules/.pnpm/@s-libs+micro-dash@18.0.0/node_modules/@s-libs/micro-dash/fesm2022/micro-dash.mjs
function keysOfNonArray(object) {
	return object ? Object.getOwnPropertyNames(object) : [];
}
function forOwnOfNonArray(object, iteratee) {
	forEachOfArray(keysOfNonArray(object), (key) => iteratee(object[key], key));
	return object;
}
function forEach(collection, iteratee) {
	if (Array.isArray(collection)) forEachOfArray(collection, iteratee);
	else forOwnOfNonArray(collection, iteratee);
	return collection;
}
function forEachOfArray(array, iteratee) {
	for (let i = 0, len = array.length; i < len; ++i) if (iteratee(array[i], i) === false) break;
}
function doReduce(iterationFn, collection, iteratee, accumulator, initAccum) {
	iterationFn(collection, (value, indexOrKey) => {
		if (initAccum) {
			accumulator = value;
			initAccum = false;
		} else accumulator = iteratee(accumulator, value, indexOrKey);
	});
	return accumulator;
}
function reduce(collection, iteratee, accumulator) {
	return doReduce(forEach, collection, iteratee, accumulator, arguments.length < 3);
}

//#endregion
//#region src/lib/util/removeEmptyKeys.ts
const removeEmptyKeys = (obj) => {
	const sanitized = reduce(obj, (acc, value, key) => {
		if (value !== null && value !== void 0) acc[key] = value;
		return acc;
	}, {});
	return sanitized;
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceUpdate.ts
const callCloudflareAPI = (endpoint, method, body, log) => {
	const apiToken = $os.getenv("MOTHERSHIP_CLOUDFLARE_API_TOKEN");
	const zoneId = $os.getenv("MOTHERSHIP_CLOUDFLARE_ZONE_ID");
	if (!apiToken || !zoneId) {
		if (log) log("Cloudflare API credentials not configured - skipping Cloudflare operations");
		return null;
	}
	const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/${endpoint}`;
	try {
		const config = {
			url,
			method,
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json"
			},
			timeout: 30
		};
		if (body) config.body = JSON.stringify(body);
		if (log) log(`Making Cloudflare API call: ${method} ${url}`, config);
		const response = $http.send(config);
		if (log) log(`Cloudflare API response:`, response);
		return response;
	} catch (error$1) {
		if (log) log(`Cloudflare API error:`, error$1);
		return null;
	}
};
const createCloudflareCustomHostname = (hostname, log) => {
	return callCloudflareAPI("custom_hostnames", "POST", {
		hostname,
		ssl: {
			method: "http",
			type: "dv"
		}
	}, log);
};
const HandleInstanceUpdate = (c) => {
	const dao = $app.dao();
	const log = mkLog(`PUT:instance`);
	log(`TOP OF PUT`);
	let data = new DynamicModel({
		id: "",
		fields: {
			subdomain: null,
			power: null,
			version: null,
			secrets: null,
			webhooks: null,
			syncAdmin: null,
			dev: null,
			cname: null
		}
	});
	c.bind(data);
	log(`After bind`);
	data = JSON.parse(JSON.stringify(data));
	const id = c.pathParam("id");
	const { fields: { subdomain, power, version, secrets, webhooks, syncAdmin, dev, cname } } = data;
	log(`vars`, JSON.stringify({
		id,
		subdomain,
		power,
		version,
		secrets,
		webhooks,
		syncAdmin,
		dev,
		cname
	}));
	const record = dao.findRecordById("instances", id);
	const authRecord = c.get("authRecord");
	log(`authRecord`, JSON.stringify(authRecord));
	if (!authRecord) throw new Error(`Expected authRecord here`);
	if (record.get("uid") !== authRecord.id) throw new BadRequestError(`Not authorized`);
	const oldCname = record.getString("cname").trim();
	const newCname = cname ? cname.trim() : "";
	const cnameChanged = oldCname !== newCname;
	if (cnameChanged && newCname) {
		log(`CNAME changed from "${oldCname}" to "${newCname}" - adding to Cloudflare`);
		const createResponse = createCloudflareCustomHostname(newCname, log);
		if (createResponse) log(`Cloudflare API call completed for "${newCname}" - frontend will poll for health`);
	}
	const sanitized = removeEmptyKeys({
		subdomain,
		version,
		power,
		secrets,
		webhooks,
		syncAdmin,
		dev,
		cname
	});
	const form = new RecordUpsertForm($app, record);
	form.loadData(sanitized);
	form.submit();
	return c.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleInstancesResetIdle.ts
const HandleInstancesResetIdle = (e) => {
	const dao = $app.dao();
	dao.db().newQuery(`update instances set status='idle'`).execute();
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleMigrateCnamesToDomains.ts
const HandleMigrateCnamesToDomains = (e) => {
	const dao = $app.dao();
	const log = mkLog(`bootstrap:migrate-cnames`);
	log(`Starting cname to domains migration`);
	try {
		const domainsCollection = dao.findCollectionByNameOrId("domains");
		if (!domainsCollection) {
			log(`Domains collection not found, skipping migration`);
			return;
		}
		log(`Checking for instances with cnames`);
		const instancesWithCnames = dao.findRecordsByFilter("instances", "cname != NULL && cname != ''");
		if (instancesWithCnames.length === 0) {
			log(`No cnames to migrate`);
			return;
		}
		log(`Found ${instancesWithCnames.length} instances with cnames`);
		log(`Phase 1: Migrating cnames to domains collection`);
		let cnameMigrated = 0;
		instancesWithCnames.forEach((instance) => {
			if (!instance) return;
			try {
				const cname = instance.getString("cname");
				if (!cname) return;
				const instanceId = instance.getId();
				let domainExists = false;
				try {
					dao.findFirstRecordByFilter("domains", `instance = "${instanceId}" && domain = "${cname}"`);
					domainExists = true;
				} catch (e$1) {}
				if (!domainExists) {
					const domainsCollection$1 = dao.findCollectionByNameOrId("domains");
					const domainRecord = new Record(domainsCollection$1);
					domainRecord.set("instance", instanceId);
					domainRecord.set("domain", cname);
					domainRecord.set("active", instance.getBool("cname_active"));
					dao.saveRecord(domainRecord);
					log(`Created domain record for ${cname}`);
					cnameMigrated++;
				}
			} catch (error$1) {
				log(`Failed to migrate cname for instance ${instance.getId()}:`, error$1);
			}
		});
		log(`Phase 1 complete: migrated ${cnameMigrated} cnames to domains collection`);
		log(`Phase 2: Syncing domains collection with instances.domains arrays`);
		const allDomainRecords = dao.findRecordsByFilter("domains", "1=1");
		log(`Found ${allDomainRecords.length} domain records`);
		let instancesUpdated = 0;
		const domainsByInstance = /* @__PURE__ */ new Map();
		allDomainRecords.forEach((domainRecord) => {
			if (!domainRecord) return;
			const instanceId = domainRecord.getString("instance");
			if (!domainsByInstance.has(instanceId)) domainsByInstance.set(instanceId, []);
			domainsByInstance.get(instanceId).push(domainRecord.getId());
		});
		log(`Updating instances.domains arrays`);
		domainsByInstance.forEach((domainIds, instanceId) => {
			try {
				const instance = dao.findRecordById("instances", instanceId);
				if (!instance) return;
				const currentDomains = instance.get("domains") || [];
				log(`Current domains:`, currentDomains);
				const missingIds = domainIds.filter((id) => !currentDomains.includes(id));
				if (missingIds.length > 0) {
					const updatedDomains = [...currentDomains, ...missingIds];
					instance.set("domains", updatedDomains);
					dao.saveRecord(instance);
					log(`Updated instance ${instanceId}: added ${missingIds.length} domain IDs to domains array`);
					instancesUpdated++;
				}
			} catch (error$1) {
				log(`Failed to update domains array for instance ${instanceId}:`, error$1);
			}
		});
		log(`Phase 2 complete: updated domains arrays for ${instancesUpdated} instances`);
	} catch (error$1) {
		log(`Error migrating cnames: ${error$1}`);
	}
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleMigrateInstanceVersions.ts
const HandleMigrateInstanceVersions = (e) => {
	const dao = $app.dao();
	const log = mkLog(`bootstrap`);
	const records = dao.findRecordsByFilter(`instances`, "1=1").filter((r) => !!r);
	const unrecognized = [];
	records.forEach((record) => {
		const v = record.getString("version").trim();
		if (versions.includes(v)) return;
		const newVersion = (() => {
			if (v.startsWith(`~`)) {
				const [major, minor] = v.slice(1).split(".");
				const newVersion$1 = [
					major,
					minor,
					"*"
				].join(".");
				return newVersion$1;
			} else if (v === `^0` || v === `0` || v === "1") return versions[0];
			return v;
		})();
		if (versions.includes(newVersion)) {
			record.set(`version`, newVersion);
			dao.saveRecord(record);
		} else unrecognized.push(v);
	});
	log({ unrecognized });
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleMigrateRegions.ts
/** Migrate version numbers */
const HandleMigrateRegions = (e) => {
	const dao = $app.dao();
	const log = mkLog(`HandleMigrateRegions`);
	log(`Migrating regions`);
	dao.db().newQuery(`update instances set region='sfo-1' where region=''`).execute();
	log(`Migrated regions`);
};

//#endregion
//#region src/lib/util/mkAudit.ts
const mkAudit = (log, dao) => {
	return (event, note, context) => {
		log(`top of audit`);
		log(`AUDIT:${event}: ${note}`, JSON.stringify({ context }, null, 2));
		dao.saveRecord(new Record(dao.findCollectionByNameOrId("audit"), {
			event,
			note,
			context
		}));
	};
};

//#endregion
//#region src/lib/handlers/instance/model/AfterCreate_notify_discord.ts
const AfterCreate_notify_discord = (e) => {
	const dao = e.dao || $app.dao();
	const log = mkLog(`instances:create:discord:notify`);
	const audit = mkAudit(log, dao);
	const webhookUrl = process.env.DISCORD_STREAM_CHANNEL_URL;
	if (!webhookUrl) return;
	const version = e.model.get("version");
	try {
		const res = $http.send({
			url: webhookUrl,
			method: "POST",
			body: JSON.stringify({ content: `Someone just created an app running PocketBase v${version}` }),
			headers: { "content-type": "application/json" },
			timeout: 5
		});
	} catch (e$1) {
		audit(`ERROR`, `Instance creation discord notify failed with ${e$1}`);
	}
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeUpdate_cname.ts
const BeforeUpdate_cname = (e) => {
	const dao = e.dao || $app.dao();
	const log = mkLog(`BeforeUpdate_cname`);
	const id = e.model.getId();
	const newCname = e.model.get("cname").trim();
	if (newCname.length > 0) {
		const result = new DynamicModel({ id: "" });
		const inUse = (() => {
			try {
				dao.db().newQuery(`select id from instances where cname='${newCname}' and id <> '${id}'`).one(result);
			} catch (e$1) {
				return false;
			}
			return true;
		})();
		if (inUse) {
			const msg = `[ERROR] [${id}] Custom domain ${newCname} already in use.`;
			log(`${msg}`);
			throw new BadRequestError(msg);
		}
		log(`CNAME validation passed for: "${newCname}"`);
	}
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeUpdate_version.ts
const BeforeUpdate_version = (e) => {
	const dao = e.dao || $app.dao();
	const log = mkLog(`BeforeUpdate_version`);
	const version = e.model.get("version");
	if (!versions.includes(version)) {
		const msg = `Invalid version ${version}. Version must be one of: ${versions.join(", ")}`;
		log(`[ERROR] ${msg}`);
		throw new BadRequestError(msg);
	}
};

//#endregion
//#region src/lib/util/mkNotifier.ts
const mkNotifier = (log, dao) => (channel, template, user_id, context = {}) => {
	log({
		channel,
		template,
		user_id
	});
	const emailTemplate = dao.findFirstRecordByData("message_templates", `slug`, template);
	log(`got email template`, emailTemplate);
	if (!emailTemplate) throw new Error(`Template ${template} not found`);
	const emailNotification = new Record(dao.findCollectionByNameOrId("notifications"), {
		user: user_id,
		channel,
		message_template: emailTemplate.getId(),
		message_template_vars: context
	});
	log(`built notification record`, emailNotification);
	dao.saveRecord(emailNotification);
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLemonSqueezySale.ts
const HandleLemonSqueezySale = (c) => {
	const dao = $app.dao();
	const log = mkLog(`ls`);
	const audit = mkAudit(log, dao);
	const context = {};
	log(`Top of ls`);
	try {
		context.secret = process.env.LS_WEBHOOK_SECRET;
		if (!context.secret) throw new Error(`No secret`);
		log(`Secret`, context.secret);
		context.raw = readerToString(c.request().body);
		context.body_hash = $security.hs256(context.raw, context.secret);
		log(`Body hash`, context.body_hash);
		context.xsignature_header = c.request().header.get("X-Signature");
		log(`Signature`, context.xsignature_header);
		if (context.xsignature_header == void 0 || !$security.equal(context.body_hash, context.xsignature_header)) throw new BadRequestError(`Invalid signature`);
		log(`Signature verified`);
		context.data = JSON.parse(context.raw);
		log(`payload`, JSON.stringify(context.data, null, 2));
		context.type = context.data?.data?.type;
		if (!context.type) throw new Error(`No type`);
		else log(`type ok`, context.type);
		context.event_name = context.data?.meta?.event_name;
		if (!context.event_name) throw new Error(`No event name`);
		else log(`event name ok`, context.event_name);
		context.user_id = context.data?.meta?.custom_data?.user_id;
		if (!context.user_id) throw new Error(`No user ID`);
		else log(`user ID ok`, context.user_id);
		context.product_id = context.data?.data?.attributes?.first_order_item?.product_id || context.data?.data?.attributes?.product_id || 0;
		if (!context.product_id) throw new Error(`No product ID`);
		else log(`product ID ok`, context.product_id);
		context.product_name = context.data?.data?.attributes?.first_order_item?.product_name || context.data?.data?.attributes?.product_name || "";
		log(`product name ok`, context.product_name);
		context.variant_id = context.data?.data?.attributes?.first_order_item?.variant_id || context.data?.data?.attributes?.variant_id || 0;
		if (!context.variant_id) throw new Error(`No variant ID`);
		else log(`variant ID ok`, context.variant_id);
		context.variant_name = context.data?.data?.attributes?.first_order_item?.variant_name || context.data?.data?.attributes?.variant_name || "";
		log(`variant name ok`, context.variant_name);
		context.quantity = context.data?.data?.attributes?.first_order_item?.quantity || 0;
		log(`quantity ok`, context.quantity);
		const FLOUNDER_ANNUAL_PV_ID = `367781-200790`;
		const FLOUNDER_LIFETIME_PV_ID = `306534-441845`;
		const PRO_MONTHLY_PV_ID = `159790-200788`;
		const PRO_ANNUAL_PV_ID = `159791-200789`;
		const FOUNDER_ANNUAL_PV_ID = `159792-200790`;
		const PAYWALL_INSTANCE_MONTHLY_PV_ID = `424532-651625`;
		const PAYWALL_PRO_MONTHLY_PV_ID = `424532-651629`;
		const PAYWALL_PRO_ANNUAL_PV_ID = `424532-651634`;
		const PAYWALL_FLOUNDER_PV_ID = `424532-651627`;
		const pv_id = `${context.product_id}-${context.variant_id}`;
		if (![
			FLOUNDER_ANNUAL_PV_ID,
			FLOUNDER_LIFETIME_PV_ID,
			PRO_MONTHLY_PV_ID,
			PRO_ANNUAL_PV_ID,
			FOUNDER_ANNUAL_PV_ID,
			PAYWALL_INSTANCE_MONTHLY_PV_ID,
			PAYWALL_PRO_MONTHLY_PV_ID,
			PAYWALL_PRO_ANNUAL_PV_ID,
			PAYWALL_FLOUNDER_PV_ID
		].includes(pv_id)) throw new Error(`Product and variant not found: ${pv_id}`);
		const userRec = (() => {
			try {
				return dao.findFirstRecordByData("users", "id", context.user_id);
			} catch (e) {
				throw new Error(`User ${context.user_id} not found`);
			}
		})();
		log(`user record ok`, userRec);
		const event_name_map = {
			order_created: () => {
				signup_finalizer();
			},
			order_refunded: () => {
				signup_canceller();
			},
			subscription_expired: () => {
				signup_canceller();
			},
			subscription_payment_refunded: () => {
				signup_canceller();
			}
		};
		const event_handler = event_name_map[context.event_name];
		if (!event_handler) throw new Error(`Unsupported event: ${context.event_name}`);
		else log(`event handler ok`, event_handler);
		const product_handler_map = {
			[FOUNDER_ANNUAL_PV_ID]: () => {
				userRec.set(`subscription`, `founder`);
				userRec.set(`subscription_interval`, `year`);
				userRec.set(`subscription_quantity`, 2147483647);
			},
			[PRO_ANNUAL_PV_ID]: () => {
				userRec.set(`subscription`, `premium`);
				userRec.set(`subscription_interval`, `year`);
				userRec.set(`subscription_quantity`, 250);
			},
			[PRO_MONTHLY_PV_ID]: () => {
				userRec.set(`subscription`, `premium`);
				userRec.set(`subscription_interval`, `month`);
				userRec.set(`subscription_quantity`, 250);
			},
			[FLOUNDER_LIFETIME_PV_ID]: () => {
				userRec.set(`subscription`, `flounder`);
				userRec.set(`subscription_interval`, `life`);
				userRec.set(`subscription_quantity`, 250);
			},
			[FLOUNDER_ANNUAL_PV_ID]: () => {
				userRec.set(`subscription`, `flounder`);
				userRec.set(`subscription_interval`, `year`);
				userRec.set(`subscription_quantity`, 250);
			},
			[PAYWALL_INSTANCE_MONTHLY_PV_ID]: () => {
				userRec.set(`subscription`, `premium`);
				userRec.set(`subscription_interval`, `month`);
				userRec.set(`subscription_quantity`, context.quantity);
			},
			[PAYWALL_PRO_MONTHLY_PV_ID]: () => {
				userRec.set(`subscription`, `premium`);
				userRec.set(`subscription_interval`, `month`);
				userRec.set(`subscription_quantity`, 250);
			},
			[PAYWALL_PRO_ANNUAL_PV_ID]: () => {
				userRec.set(`subscription`, `premium`);
				userRec.set(`subscription_interval`, `year`);
				userRec.set(`subscription_quantity`, 250);
			},
			[PAYWALL_FLOUNDER_PV_ID]: () => {
				userRec.set(`subscription`, `flounder`);
				userRec.set(`subscription_interval`, `life`);
				userRec.set(`subscription_quantity`, 250);
			}
		};
		const product_handler = product_handler_map[pv_id];
		if (!product_handler) throw new Error(`No product handler for ${pv_id}`);
		else log(`product handler ok`, pv_id);
		const signup_finalizer = () => {
			product_handler();
			dao.saveRecord(userRec);
			log(`saved user`);
			const notify = mkNotifier(log, dao);
			const { user_id } = context;
			if (!user_id) throw new Error(`User ID expected here`);
			notify(`lemonbot`, `lemon_order_discord`, user_id, context);
			log(`saved discord notice`);
			audit(`LS`, `Signup processed.`, context);
		};
		const signup_canceller = () => {
			if (userRec.get(`subscription`) !== `premium`) return;
			const currentQuantity = userRec.get(`subscription_quantity`);
			const newQuantity = Math.max(currentQuantity - (context.quantity || 1), 0);
			userRec.set(`subscription_quantity`, newQuantity);
			if (newQuantity === 0) {
				userRec.set(`subscription`, `free`);
				userRec.set(`subscription_interval`, ``);
			}
			dao.saveRecord(userRec);
			log(`saved user`);
			audit(`LS`, `Signup cancelled.`, context);
		};
		event_handler();
		return c.json(200, { status: "ok" });
	} catch (e) {
		audit(`LS_ERR`, `${e}`, context);
		return c.json(500, {
			status: `error`,
			error: e.message
		});
	}
};

//#endregion
//#region src/lib/handlers/mail/api/HandleMailSend.ts
const HandleMailSend = (c) => {
	const log = mkLog(`mail`);
	let data = new DynamicModel({
		to: "",
		subject: "",
		body: ""
	});
	log(`before bind`);
	c.bind(data);
	log(`after bind`);
	data = JSON.parse(JSON.stringify(data));
	log(`bind parsed`, JSON.stringify(data));
	const { to, subject, body } = data;
	const email = new MailerMessage({
		from: {
			address: $app.settings().meta.senderAddress,
			name: $app.settings().meta.senderName
		},
		to: [{ address: to }],
		bcc: [process.env.TEST_EMAIL].filter((e) => !!e).map((e) => ({ address: e })),
		subject,
		html: body
	});
	$app.newMailClient().send(email);
	const msg = `Sent to ${to}`;
	log(msg);
	return c.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/meta/boot/HandleMetaUpdateAtBoot.ts
const HandleMetaUpdateAtBoot = (c) => {
	const log = mkLog("HandleMetaUpdateAtBoot");
	log(`At top of HandleMetaUpdateAtBoot`);
	log(`app URL`, process.env.APP_URL);
	const form = new SettingsUpsertForm($app);
	form.meta = {
		...$app.settings().meta,
		appUrl: process.env.APP_URL || $app.settings().meta.appUrl,
		verificationTemplate: {
			...$app.settings().meta.verificationTemplate,
			actionUrl: `{APP_URL}/login/confirm-account/{TOKEN}`
		},
		resetPasswordTemplate: {
			...$app.settings().meta.resetPasswordTemplate,
			actionUrl: `{APP_URL}/login/password-reset/confirm/{TOKEN}`
		},
		confirmEmailChangeTemplate: {
			...$app.settings().meta.confirmEmailChangeTemplate,
			actionUrl: `{APP_URL}/login/confirm-email-change/{TOKEN}`
		}
	};
	log(`Saving form`);
	form.submit();
	log(`Saved form`);
};

//#endregion
//#region src/lib/handlers/mirror/api/HandleMirrorData.ts
const HandleMirrorData = (c) => {
	const users = $app.dao().findRecordsByExpr("verified_users", $dbx.exp("1=1"));
	const instances = $app.dao().findRecordsByExpr("instances", $dbx.exp("instances.uid in (select id from verified_users)"));
	return c.json(200, {
		users,
		instances
	});
};

//#endregion
//#region src/lib/util/mkNotificationProcessor.ts
const mkNotificationProcessor = (log, dao, test = false) => (notificationRec) => {
	log({ notificationRec });
	const channel = notificationRec.getString(`channel`);
	dao.expandRecord(notificationRec, ["message_template", "user"]);
	const messageTemplateRec = notificationRec.expandedOne("message_template");
	if (!messageTemplateRec) throw new Error(`Missing message template`);
	const userRec = notificationRec.expandedOne("user");
	if (!userRec) throw new Error(`Missing user record`);
	const vars = JSON.parse(notificationRec.getString(`message_template_vars`));
	const to = userRec.email();
	const subject = interpolateString(messageTemplateRec.getString(`subject`), vars);
	const html = interpolateString(messageTemplateRec.getString(`body_html`), vars);
	log({
		channel,
		messageTemplateRec,
		userRec,
		vars,
		to,
		subject,
		html
	});
	switch (channel) {
		case `email`:
			/** @type {Partial<mailer.Message_In>} */
			const msgArgs = {
				from: {
					address: $app.settings().meta.senderAddress,
					name: $app.settings().meta.senderName
				},
				to: [{ address: to }],
				bcc: [{ address: `pockethost+notifications@benallfree.com` }],
				subject,
				html
			};
			if (test) {
				msgArgs.to = [{ address: `ben@benallfree.com` }];
				msgArgs.subject = `***TEST ${to} *** ${msgArgs.subject}`;
			}
			log({ msgArgs });
			const msg = new MailerMessage(msgArgs);
			$app.newMailClient().send(msg);
			log(`email sent`);
			break;
		case `lemonbot`:
			const url = test ? process.env.DISCORD_TEST_CHANNEL_URL : process.env.DISCORD_STREAM_CHANNEL_URL;
			if (url) {
				const params = {
					url,
					method: "POST",
					body: JSON.stringify({ content: subject }),
					headers: { "content-type": "application/json" },
					timeout: 5
				};
				log(`sending discord message`, params);
				const res = $http.send(params);
				log(`discord sent`, res);
			}
			break;
		default: throw new Error(`Unsupported channel: ${channel}`);
	}
	if (!test) {
		notificationRec.set(`delivered`, new DateTime());
		dao.saveRecord(notificationRec);
	}
};

//#endregion
//#region src/lib/handlers/notify/api/HandleProcessSingleNotification.ts
const HandleProcessSingleNotification = (c) => {
	const log = mkLog(`process_single_notification`);
	log(`start`);
	const dao = $app.dao();
	const processNotification = mkNotificationProcessor(log, dao, !!c.queryParam(`test`));
	try {
		const notification = dao.findFirstRecordByData(`notifications`, `delivered`, ``);
		if (!notification) return c.json(200, `No notifications to send`);
		processNotification(notification);
	} catch (e) {
		c.json(500, `${e}`);
	}
	return c.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/notify/model/HandleProcessNotification.ts
const HandleProcessNotification = (e) => {
	const dao = e.dao || $app.dao();
	const log = mkLog(`notification:sendImmediately`);
	const audit = mkAudit(log, dao);
	const processNotification = mkNotificationProcessor(log, dao, false);
	const notificationRec = e.model;
	log({ notificationRec });
	try {
		dao.expandRecord(notificationRec, ["message_template"]);
		const messageTemplateRec = notificationRec.expandedOne(`message_template`);
		if (!messageTemplateRec) throw new Error(`Missing message template`);
		processNotification(notificationRec);
	} catch (e$1) {
		audit(`ERROR`, `${e$1}`, { notification: notificationRec.getId() });
	}
};

//#endregion
//#region src/lib/handlers/notify/model/HandleUserWelcomeMessage.ts
const HandleUserWelcomeMessage = (e) => {
	const dao = e.dao || $app.dao();
	const newModel = e.model;
	const oldModel = newModel.originalCopy();
	const log = mkLog(`user-welcome-msg`);
	const notify = mkNotifier(log, dao);
	const audit = mkAudit(log, dao);
	try {
		log({
			newModel,
			oldModel
		});
		const isVerified = newModel.getBool("verified");
		if (!isVerified) return;
		if (isVerified === oldModel.getBool(`verified`)) return;
		log(`user just became verified`);
		const uid = newModel.getId();
		notify(`email`, `welcome`, uid);
		newModel.set(`welcome`, new DateTime());
	} catch (e$1) {
		audit(`ERROR`, `${e$1}`, { user: newModel.getId() });
	}
};

//#endregion
//#region src/lib/handlers/signup/error.ts
const error = (fieldName, slug, description, extra) => new ApiError(500, description, {
	[fieldName]: new ValidationError(slug, description),
	...extra
});

//#endregion
//#region src/lib/handlers/signup/isAvailable.ts
const isAvailable = (slug) => {
	try {
		const record = $app.dao().findFirstRecordByData("instances", "subdomain", slug);
		return false;
	} catch {
		return true;
	}
};

//#endregion
//#region src/lib/handlers/signup/random-words/wordList.ts
const wordList = [
	"ability",
	"....deleteed for brevity....",
	
	"zulu"
];

//#endregion
//#region src/lib/handlers/signup/random-words/index.ts
const shortestWordSize = wordList.reduce((shortestWord, currentWord) => currentWord.length < shortestWord.length ? currentWord : shortestWord).length;
const longestWordSize = wordList.reduce((longestWord, currentWord) => currentWord.length > longestWord.length ? currentWord : longestWord).length;
function generate(options) {
	const { minLength, maxLength,...rest } = options || {};
	function word() {
		let min = typeof minLength !== "number" ? shortestWordSize : limitWordSize(minLength);
		const max = typeof maxLength !== "number" ? longestWordSize : limitWordSize(maxLength);
		if (min > max) min = max;
		let rightSize = false;
		let wordUsed;
		while (!rightSize) {
			wordUsed = generateRandomWord();
			rightSize = wordUsed.length <= max && wordUsed.length >= min;
		}
		return wordUsed;
	}
	function generateRandomWord() {
		return wordList[randInt(wordList.length)];
	}
	function limitWordSize(wordSize) {
		if (wordSize < shortestWordSize) wordSize = shortestWordSize;
		if (wordSize > longestWordSize) wordSize = longestWordSize;
		return wordSize;
	}
	function randInt(lessThan) {
		const r = Math.random();
		return Math.floor(r * lessThan);
	}
	if (options === void 0) return word();
	if (typeof options === "number") options = { exactly: options };
	else if (Object.keys(rest).length === 0) return word();
	if (options.exactly) {
		options.min = options.exactly;
		options.max = options.exactly;
	}
	if (typeof options.wordsPerString !== "number") options.wordsPerString = 1;
	if (typeof options.formatter !== "function") options.formatter = (word$1) => word$1;
	if (typeof options.separator !== "string") options.separator = " ";
	const total = options.min + randInt(options.max + 1 - options.min);
	let results = [];
	let token = "";
	let relativeIndex = 0;
	for (let i = 0; i < total * options.wordsPerString; i++) {
		if (relativeIndex === options.wordsPerString - 1) token += options.formatter(word(), relativeIndex);
		else token += options.formatter(word(), relativeIndex) + options.separator;
		relativeIndex++;
		if ((i + 1) % options.wordsPerString === 0) {
			results.push(token);
			token = "";
			relativeIndex = 0;
		}
	}
	if (typeof options.join === "string") results = results.join(options.join);
	return results;
}

//#endregion
//#region src/lib/handlers/signup/api/HandleSignupCheck.ts
const HandleSignupCheck = (c) => {
	const instanceName = (() => {
		const name = c.queryParam("name").trim();
		if (name) {
			if (name.match(/^[a-z][a-z0-9-]{2,39}$/) === null) throw error(`instanceName`, `invalid`, `Instance name must begin with a letter, be between 3-40 characters, and can only contain a-z, 0-9, and hyphen (-).`);
			if (isAvailable(name)) return name;
			throw error(`instanceName`, `exists`, `Instance name ${name} is not available.`);
		} else {
			let i = 0;
			while (true) {
				i++;
				if (i > 100) return +/* @__PURE__ */ new Date();
				const slug = generate(2).join(`-`);
				if (isAvailable(slug)) return slug;
			}
		}
	})();
	return c.json(200, { instanceName });
};

//#endregion
//#region src/lib/handlers/signup/api/HandleSignupConfirm.ts
const HandleSignupConfirm = (c) => {
	const dao = $app.dao();
	const parsed = (() => {
		const rawBody = readerToString(c.request().body);
		try {
			const parsed$1 = JSON.parse(rawBody);
			return parsed$1;
		} catch (e) {
			throw new BadRequestError(`Error parsing payload. You call this JSON? ${rawBody}`, e);
		}
	})();
	const email = parsed.email?.trim().toLowerCase();
	const password = parsed.password?.trim();
	const desiredInstanceName = parsed.instanceName?.trim();
	const region = parsed.region?.trim();
	const version = parsed.version?.trim() || versions[0];
	if (!email) throw error(`email`, "required", "Email is required");
	if (!password) throw error(`password`, `required`, "Password is required");
	if (!desiredInstanceName) throw error(`instanceName`, `required`, `Instance name is required`);
	const userExists = (() => {
		try {
			const record = dao.findFirstRecordByData("users", "email", email);
			return true;
		} catch {
			return false;
		}
	})();
	if (userExists) throw error(`email`, `exists`, `That user account already exists. Try a password reset.`);
	dao.runInTransaction((txDao) => {
		const usersCollection = dao.findCollectionByNameOrId("users");
		const instanceCollection = $app.dao().findCollectionByNameOrId("instances");
		const user = new Record(usersCollection);
		try {
			const username = $app.dao().suggestUniqueAuthRecordUsername("users", "user" + $security.randomStringWithAlphabet(5, "123456789"));
			user.set("username", username);
			user.set("email", email);
			user.set("subscription", "free");
			user.set("subscription_quantity", 0);
			user.setPassword(password);
			txDao.saveRecord(user);
		} catch (e) {
			throw error(`email`, `fail`, `Could not create user: ${e}`);
		}
		try {
			const instance = new Record(instanceCollection);
			instance.set("subdomain", desiredInstanceName);
			instance.set("region", region || `sfo-2`);
			instance.set("uid", user.get("id"));
			instance.set("status", "idle");
			instance.set("power", true);
			instance.set("syncAdmin", true);
			instance.set("dev", true);
			instance.set("version", version);
			txDao.saveRecord(instance);
		} catch (e) {
			if (`${e}`.match(/ UNIQUE /)) throw error(`instanceName`, `exists`, `Instance name was taken, sorry about that. Try another.`);
			throw error(`instanceName`, `fail`, `Could not create instance: ${e}`);
		}
		$mails.sendRecordVerification($app, user);
	});
	return c.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/sns/api/HandleSesError.ts
function isSnsSubscriptionConfirmationEvent(event) {
	return event.Type === "SubscriptionConfirmation";
}
function isSnsNotificationEvent(event) {
	return event.Type === "Notification";
}
function isSnsNotificationBouncePayload(payload) {
	return payload.notificationType === "Bounce";
}
function isSnsNotificationComplaintPayload(payload) {
	return payload.notificationType === "Complaint";
}
const HandleSesError = (c) => {
	const dao = $app.dao();
	const log = mkLog(`sns`);
	const audit = mkAudit(log, dao);
	const processBounce = (emailAddress) => {
		log(`Processing ${emailAddress}`);
		const extra = { email: emailAddress };
		try {
			const user = dao.findFirstRecordByData("users", "email", emailAddress);
			log(`user is`, user);
			extra.user = user.getId();
			user.setVerified(false);
			dao.saveRecord(user);
			audit("PBOUNCE", `User ${emailAddress} has been disabled`, extra);
		} catch (e) {
			audit("PBOUNCE_ERR", `${e}`, extra);
		}
	};
	const raw = readerToString(c.request().body);
	const data = JSON.parse(raw);
	log(JSON.stringify(data, null, 2));
	if (isSnsSubscriptionConfirmationEvent(data)) {
		const url = data.SubscribeURL;
		log(url);
		$http.send({ url });
		return c.json(200, { status: "ok" });
	}
	if (isSnsNotificationEvent(data)) {
		const msg = JSON.parse(data.Message);
		log(msg);
		if (isSnsNotificationBouncePayload(msg)) {
			log(`Message is a bounce`);
			const { bounce } = msg;
			const { bounceType } = bounce;
			switch (bounceType) {
				case `Permanent`:
					log(`Message is a permanent bounce`);
					const { bouncedRecipients } = bounce;
					bouncedRecipients.forEach((recipient) => {
						const { emailAddress } = recipient;
						processBounce(emailAddress);
					});
					break;
				default: audit("SNS_ERR", `Unrecognized bounce type ${bounceType}`, { raw });
			}
		} else if (isSnsNotificationComplaintPayload(msg)) {
			log(`Message is a Complaint`, msg);
			const { complaint } = msg;
			const { complainedRecipients } = complaint;
			complainedRecipients.forEach((recipient) => {
				const { emailAddress } = recipient;
				log(`Processing ${emailAddress}`);
				try {
					const user = $app.dao().findFirstRecordByData("users", "email", emailAddress);
					log(`user is`, user);
					user.set(`unsubscribe`, true);
					dao.saveRecord(user);
					audit("COMPLAINT", `User ${emailAddress} has been unsubscribed`, {
						emailAddress,
						user: user.getId()
					});
				} catch (e) {
					audit("COMPLAINT_ERR", `${emailAddress} is not in the system.`, { emailAddress });
				}
			});
		} else audit("SNS_ERR", `Unrecognized notification type ${data.Type}`, { raw });
	}
	audit(`SNS_ERR`, `Message ${data.Type} not handled`, { raw });
	return c.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/stats/api/HandleStatsRequest.ts
const HandleStatsRequest = (c) => {
	const result = new DynamicModel({ total_flounder_subscribers: 0 });
	$app.dao().db().select("total_flounder_subscribers").from("stats").one(result);
	return c.json(200, result);
};

//#endregion
//#region src/lib/handlers/user/api/HandleUserTokenRequest.ts
const HandleUserTokenRequest = (c) => {
	const dao = $app.dao();
	const log = mkLog(`user-token`);
	const id = c.pathParam("id");
	if (!id) throw new BadRequestError(`User ID is required.`);
	const rec = dao.findRecordById("users", id);
	const tokenKey = rec.getString("tokenKey");
	const passwordHash = rec.getString("passwordHash");
	const email = rec.getString(`email`);
	return c.json(200, {
		email,
		passwordHash,
		tokenKey
	});
};

//#endregion
//#region src/lib/handlers/versions/api/HandleVersionsRequest.ts
/** Return a list of available PocketBase versions */
const HandleVersionsRequest = (c) => {
	return c.json(200, { versions });
};

//#endregion
exports.AfterCreate_notify_discord = AfterCreate_notify_discord;
exports.BeforeUpdate_cname = BeforeUpdate_cname;
exports.BeforeUpdate_version = BeforeUpdate_version;
exports.HandleInstanceCreate = HandleInstanceCreate;
exports.HandleInstanceDelete = HandleInstanceDelete;
exports.HandleInstanceResolve = HandleInstanceResolve;
exports.HandleInstanceUpdate = HandleInstanceUpdate;
exports.HandleInstancesResetIdle = HandleInstancesResetIdle;
exports.HandleLemonSqueezySale = HandleLemonSqueezySale;
exports.HandleMailSend = HandleMailSend;
exports.HandleMetaUpdateAtBoot = HandleMetaUpdateAtBoot;
exports.HandleMigrateCnamesToDomains = HandleMigrateCnamesToDomains;
exports.HandleMigrateInstanceVersions = HandleMigrateInstanceVersions;
exports.HandleMigrateRegions = HandleMigrateRegions;
exports.HandleMirrorData = HandleMirrorData;
exports.HandleProcessNotification = HandleProcessNotification;
exports.HandleProcessSingleNotification = HandleProcessSingleNotification;
exports.HandleSesError = HandleSesError;
exports.HandleSignupCheck = HandleSignupCheck;
exports.HandleSignupConfirm = HandleSignupConfirm;
exports.HandleStatsRequest = HandleStatsRequest;
exports.HandleUserTokenRequest = HandleUserTokenRequest;
exports.HandleUserWelcomeMessage = HandleUserWelcomeMessage;
exports.HandleVersionsRequest = HandleVersionsRequest;