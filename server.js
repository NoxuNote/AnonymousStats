const http = require('http');
const { IncomingWebhook, WebClient } = require('@slack/client');

const timeNotification = new IncomingWebhook('https://hooks.slack.com/services/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');
const currentTime = new Date().toTimeString();

function sendNotification(texte) {
    const notif = new IncomingWebhook("https://hooks.slack.com/services/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");

	notif.send(texte, (error, resp) => {
	  if (error) {
	    return console.error(error);
	  }
	  console.log('Notification sent');
	});
}

const hostname = 'noxunote.fr';
const port = 35200;

function paquetRecu(body, host) {
	jbody = JSON.parse(body)
	innerString = jbody.type+" sur "+jbody.os+" version "+jbody.version+" session n°"+jbody.session
	console.log(innerString)
	sendNotification(innerString)
}

const server = http.createServer((req, res) => {
	if (req.method == "POST") {
		var body = '';
		req.on('data', (data)=> {
			body += data;
		})
		req.on('end', ()=> {
			paquetRecu(body, req.socket.remoteAddress)
		})
		res.writeHead(200, {'Content-Type': 'text/html'});
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

// {"type":"lancement","version":"0.3.4","os":"darwin","session":24907}
