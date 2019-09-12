import { Session, BodyPacket, Rapport } from './types'
const http = require('http')
const osu = require('node-os-utils')

/**
 * when DEBUG is true
 * - host is changed to localhost:35200
 * - SESSION_EXPIRY_DELAY is 30 sec instead of 360
 * - System informations are not displayed
 */
const DEBUG: boolean = false
const GUI: boolean = false
const SESSION_EXPIRY_DELAY = DEBUG ? 10 : 360
const DATA_UPDATE_DELAY = 2000

const hostname = DEBUG ? 'localhost' : 'noxunote.fr';
const port = 35200;

let activeSessions: Session[] = []
let inactiveSessions: Session[] = []

// updates every DATA_UPDATE_DELAY
let lastRapport: Rapport

/***************************************************************************************************
 *                                           HTTP SERVER                                           *
 ***************************************************************************************************/

function paquetRecu(bodyString: string) {
	let body
	try {
		body = JSON.parse(bodyString) as BodyPacket
	} catch(e) {
		console.warn("Can't parse body to JSON object")
		return
	}
	if (!body)
		return
	let session: Session = Session.findInList(activeSessions, body.session)
	if (!session) {
		// Création d'un nouvelle session
		let s: Session = new Session(body.os, body.version, body.session, SESSION_EXPIRY_DELAY)
		// Ajout à la liste
		activeSessions.push(s)
		s.expiryEvent.on('expired', () => {
			// Suppression de la liste en cas d'expiration
			activeSessions.splice(activeSessions.findIndex(sess => sess.sessionId == s.sessionId), 1)
			// Ajout a la liste des sessions inactives
			inactiveSessions.push(s)
		})
	} else {
		session.update()
	}
}

const server = http.createServer((req: any, res: any) => {
	if (req.method == "POST") {
		var body = '';
		req.on('data', (data: any) => {
			body += data;
		})
		req.on('end', () => {
			paquetRecu(body)
		})
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end('post received');
	} else if (req.method == "GET") {
		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(lastRapport));
	} else {
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/html');
		res.end('<meta charset="utf-8">Erreur de session, cet incident à été enregistré.\n');
	}
});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});

/***************************************************************************************************
 *                                               GUI                                               *
 ***************************************************************************************************/
// Gui vars
let userCount: any
let sysInfo: any
let screen: any
if (GUI) {
	const blessed = require('blessed')
	const contrib = require('blessed-contrib')
	const screen = blessed.screen()
	const grid = new contrib.grid({ rows: 1, cols: 2, screen: screen })
	const userCount = grid.set(0, 0, 1, 1, contrib.bar,
		{
			label: 'Users',
			barWidth: 4,
			barSpacing: 6,
			xOffset: 0,
			maxHeight: 9,
		}
	)
	const sysInfo = grid.set(0, 1, 1, 1, contrib.bar,
		{
			label: 'System information',
			barWidth: 4,
			barSpacing: 6,
			xOffset: 0,
			maxHeight: 100,
		}
	)
}

setInterval(() => {
	generateRapport().then((rapport: Rapport) => {
		if (GUI) {
			userCount.setData({
				titles: ['online', 'total'],
				data: [rapport.stats.online, rapport.stats.total]
			})
			sysInfo.setData({
				titles: ['CPU (%)', `Memory (%)`, 'Bandwitch'],
				data: [rapport.system.cpuUsage, rapport.system.memoryUsage, rapport.system.BandwitchUsage]
			})
			screen.render()
		}
	})
}, DATA_UPDATE_DELAY)
/***************************************************************************************************
 *                                         DATA GENERATION                                         *
 ***************************************************************************************************/

async function generateRapport(): Promise<Rapport> {
	let allSessions: Session[] = [...activeSessions, ...inactiveSessions]
	// Count users by version
	let allVersions: Set<string> = getVersions(allSessions)
	let infos = await Promise.all([
		osu.cpu.usage(),
		osu.mem.info(),
		osu.netstat.inOut()
	])
	let now = new Date()
	lastRapport = {
		"stats": {
			"online": activeSessions.length,
			"total": allSessions.length,
			"bySystemActive": {
				"darwin": activeSessions.filter(s=>s.os=="darwin").length,
				"win32": activeSessions.filter(s=>s.os=="windows").length,
				"linux": activeSessions.filter(s=>s.os=="linux").length,
				"other": activeSessions.filter(s=>!["darwin", "windows", "linux"].includes(s.os)).length
			},
			"bySystemAll": {
				"darwin": allSessions.filter(s=>s.os=="darwin").length,
				"win32": allSessions.filter(s=>s.os=="windows").length,
				"linux": allSessions.filter(s=>s.os=="linux").length,
				"other": allSessions.filter(s=>!["darwin", "windows", "linux"].includes(s.os)).length
			},
			"byVersionActive": Array.from(allVersions).map((v: string) => {
				return {
					version: v,
					count: activeSessions.filter(s=>s.version==v).length
				}
			}),
			"byVersionAll": Array.from(allVersions).map((v: string) => {
				return {
					version: v,
					count: allSessions.filter(s=>s.version==v).length
				}
			}),
			"byPeriod": {
				"today": allSessions.filter(s=> !s.isExpired || (now.getDate()==s.beginDate.getDate())).length,
				"last24Hours": allSessions.filter(s=> !s.isExpired || (now.getTime()-s.beginDate.getTime())<(3600*1000*24)).length,
				"last48Hours": allSessions.filter(s=> !s.isExpired || (now.getTime()-s.beginDate.getTime())<(3600*1000*48)).length,
				"lastWeek": allSessions.filter(s=> !s.isExpired || (now.getTime()-s.beginDate.getTime())<(3600*1000*24*7)).length,
				"lastHour": allSessions.filter(s=> !s.isExpired || (now.getTime()-s.beginDate.getTime())<(3600*1000*1)).length
			}
		},
		"system": {
			"cpuUsage": infos[0],
			"memoryUsage": 100-infos[1].freeMemPercentage,
			"BandwitchUsage": !DEBUG ? infos[2].total.outputMb : 0
		}
	}
	return lastRapport
}

function getVersions(sessions: Session[]): Set<string> {
	let versions: Set<string> = new Set()
	sessions.forEach(s => versions.add(s.version));
	return versions
} 