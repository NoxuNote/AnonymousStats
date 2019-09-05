import { EventEmitter } from "events";

export class Session {

  os: string
  version: string
  sessionId: string
  beginTime: Date
  expiryTime: number
  expiryTimeout: NodeJS.Timeout
  expiryEvent: EventEmitter = new EventEmitter()

  /**
   * 
   * @param os Version du système (darwin, win32, linux)
   * @param version Version de NoxuNote
   * @param sessionId Id de la session (nombre)
   * @param expiryTime Nombre de min avant expiration de la session
   */
  constructor(os: string, version: string, sessionId: string, expiryTime: number) {
    this.os = os
    this.version = version
    this.sessionId = sessionId
    this.expiryTime = expiryTime
    this.beginTime = new Date()
    this.expiryTimeout = setTimeout(() => this.expire(), this.expiryTime * 60 * 1000)
  }

  /**
   * Updates session activity
   */
  public update() {
    clearTimeout(this.expiryTimeout)
    this.expiryTimeout = setTimeout(() => this.expire(), this.expiryTime * 60 * 1000)
  }

  /**
   * Set the function as expired
   */
  public expire() {
    this.expiryEvent.emit("expired")
  }

  static findInList(sessionList: Session[], sessionId: string): Session {
    return sessionList.find(s => s.sessionId == sessionId)
  }

}

export type BodyPacket = {
  session: string,
  os: string,
  version: string,
  type: string,
} 