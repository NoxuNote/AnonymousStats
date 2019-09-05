import { Session, BodyPacket } from './types'
const http = require('http')
const osu = require('node-os-utils')

const DEBUG: boolean = true

const hostname = DEBUG ? 'localhost' : 'noxunote.fr';
const port = 35200;

let activeSessions: Session[] = []
let inactiveSessions: Session[] = []

function paquetRecu(bodyString: string) {
	let body = JSON.parse(bodyString) as BodyPacket
	if (!body)
		return
	let session: Session = Session.findInList(activeSessions, body.session)
	if (!session) {
		// Création d'un nouvelle session
		let s: Session = new Session(body.os, body.version, body.session, 6)
		// Ajout à la liste
		this.activeSessions.push(s)
		s.expiryEvent.on('expire', () => {
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
import * as Blessed from 'blessed'
const contrib = require('blessed-contrib')
const screen = Blessed.screen()
const grid = new contrib.grid({ rows: 1, cols: 2, screen: screen })


const userCount = grid.set(0, 0, 1, 1, contrib.bar,
	{
		label: 'Active users',
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

setInterval(() => {

	userCount.setData({
		titles: ['utilisateurs'],
		data: [3]
	})
	
	let systemInfo = Promise.all([
		osu.cpu.usage(),
		osu.mem.info(),
		osu.netstat.inOut()
	])

	systemInfo.then((infos: any[])=>{
		sysInfo.setData({
			titles: ['CPU (%)', `Memory (%)`, 'Bandwitch'],
			data: [infos[0], 100-infos[1].freeMemPercentage, infos[2].total.outputMb.toString()]
		})
	}).catch((error)=>{
		console.log(error)
	})

	screen.render()
}, 1000)

