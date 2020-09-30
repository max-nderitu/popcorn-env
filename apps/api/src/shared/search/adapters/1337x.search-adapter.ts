import { Episode, Movie, Torrent } from '@pct-org/mongo-models'
import { Logger } from '@nestjs/common'
import { search, info } from 'xtorrent'
import { parse as parseBytes } from 'bytes'

import { SearchAdapter } from '../search-base.adapter'

export class OneThreeThreeSevenXSearchAdapater extends SearchAdapter {

  static providerName = '1337x'

  private readonly logger = new Logger(OneThreeThreeSevenXSearchAdapater.name)

  /**
   * These uploaders are Vip Uploaders / trusted
   */
  private readonly trustedUploaders = [
    'ETTV',
    'EtHD',
    'MkvCage',
    'mazemaze16',
    'MrStark',
    'SeekNDstroy',
    'Cristie',
    'mazemaze16',
    'TeamRocker',
    'YIFY',
    'PMEDIA',
    'bone111',
    'Silmarillion'
  ]
  /**
   * Search for a episode
   *
   * @param episode
   * @returns {Promise<*>}
   */
  searchEpisode = async (episode: Episode) => {
    try {
      const { torrents, domain } = await search({
        query: this.getEpisodeQuery(episode),
        category: 'TV'
      })

      // Get all the torrents from trusted uploaders and validate if the
      // season and episode format is in the torrent
      const foundTorrents = torrents.filter((torrent) =>
        this.trustedUploaders.includes(torrent.uploader) &&
        torrent.title.toUpperCase().includes(this.buildSeasonEpisodeString(episode).toUpperCase())
      )

      const results = await Promise.all(
        foundTorrents.map((torrent) => this.formatTorrent(torrent, domain))
      )

      return results.filter(Boolean)

    } catch (e) {
      this.logger.error('Error searching for episode!', e)
    }

    return []
  }

  /**
   * Search for movies
   *
   * @param movie
   * @returns {Promise<*>}
   */
  searchMovie = async (movie: Movie) => {
    try {
      const { torrents, domain } = await search({
        query: movie.title,
        category: 'Movies'
      })

      // Get all the torrents from trusted uploaders
      const foundTorrents = torrents.filter((torrent) =>
        this.trustedUploaders.includes(torrent.uploader)
      )

      const results = await Promise.all(
        foundTorrents.map((torrent) => this.formatTorrent(torrent, domain))
      )

      return results.filter(Boolean)

    } catch (e) {
      this.logger.error('Error searching for movie!', e)
    }

    return []
  }

  formatTorrent = async (torrent, domain: string): Promise<Torrent | boolean> => {
    const quality = this.determineQuality(torrent.title)

    // If we could not determine the quality we are not adding it
    if (!quality) {
      return false
    }

    const data = await info(`${domain}${torrent.href}`)

    return {
      language: 'en',
      peers: parseInt(data.leechers, 10),
      provider: `${OneThreeThreeSevenXSearchAdapater.providerName} - ${torrent.uploader}`,
      quality: quality,
      seeds: parseInt(data.seeders, 10),
      size: parseBytes(data.size),
      sizeString: data.size,
      title: data.title,
      type: SearchAdapter.TORRENT_TYPE,
      url: data.download.magnet
    }
  }

}
