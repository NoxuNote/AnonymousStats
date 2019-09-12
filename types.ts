import { EventEmitter } from "events";

export class Session {

  os: string
  version: string
  sessionId: string
  beginDate: Date
  expiryTime: number
  expiryTimeout: NodeJS.Timeout
  expiryEvent: EventEmitter = new EventEmitter()
  isExpired: boolean = false
  expiredDate: Date

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
    this.beginDate = new Date()
    this.expiryTimeout = setTimeout(() => this.expire(), this.expiryTime * 1000)
  }

  /**
   * Updates session activity
   */
  public update() {
    clearTimeout(this.expiryTimeout)
    this.expiryTimeout = setTimeout(() => this.expire(), this.expiryTime * 1000)
  }

  /**
   * Set the function as expired
   */
  public expire() {
    this.expiryEvent.emit("expired")
    this.isExpired = true
  }

  public getDuration(): number {
    if (this.isExpired) {
      return this.expiredDate.getTime() - this.beginDate.getTime()
    } else {
      return (new Date()).getTime() - this.beginDate.getTime()
    }
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

export type Rapport = {
  stats: {
    online: number,
    total: number
    bySystemActive: {
      darwin: number,
      win32: number,
      linux: number
      other: number
    },
    bySystemAll: {
      darwin: number,
      win32: number,
      linux: number
      other: number
    },
    byVersionActive: {version: string, count: number}[]
    byVersionAll: {version: string, count: number}[]
    byPeriod: {
      today: number,
      last24Hours: number
      last48Hours: number
      lastWeek: number
      lastHour: number
    }
  }
  system: {
    cpuUsage: number,
    memoryUsage: number,
    BandwitchUsage: number
  }
}