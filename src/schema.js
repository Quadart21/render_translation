/**
 * @typedef {'android'|'ios'} Platform
 * @typedef {'left'|'right'} Side
 *
 * @typedef {Object} StatusBar
 * @property {string} time  Время в строке состояния (например "14:32")
 *
 * @typedef {Object} Participant
 * @property {string} id
 * @property {string} name
 * @property {Side} side
 * @property {string|null} [avatar]  Абсолютный путь к файлу или data URL / https URL
 *
 * @typedef {Object} ItemDate
 * @property {'date'} type
 * @property {string} label
 *
 * @typedef {Object} ItemText
 * @property {'text'} type
 * @property {string} from  id участника
 * @property {string} time
 * @property {string} text
 *
 * @typedef {Object} ItemImage
 * @property {'image'} type
 * @property {string} from
 * @property {string} time
 * @property {string|null} [src]  путь к файлу или null для заглушки
 * @property {string} [caption]
 * @property {string} [action]  подпись на кнопке под картинкой (например «Открыть»)
 *
 * @typedef {ItemDate|ItemText|ItemImage} ChatItem
 *
 * @typedef {Object} Scene
 * @property {Platform} platform
 * @property {StatusBar} statusBar
 * @property {Participant[]} participants
 * @property {ChatItem[]} items
 */

export {};
