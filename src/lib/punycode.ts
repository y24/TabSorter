/**
 * URLとドメインの正規化に関するユーティリティクラス
 */
export class UrlUtils {
  /**
   * URLを正規化する（punycode変換）
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.hostname = this.normalizeHostname(urlObj.hostname);
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * ホスト名を正規化する（punycode変換）
   */
  static normalizeHostname(hostname: string): string {
    try {
      // punycode変換を試行
      return new URL(`http://${hostname}`).hostname;
    } catch {
      return hostname;
    }
  }

  /**
   * eTLD+1ドメインを抽出する
   */
  static getETLDPlusOne(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = this.normalizeHostname(urlObj.hostname);
      
      // 簡単な実装（実際のeTLD+1抽出はより複雑）
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return hostname;
    } catch {
      return '';
    }
  }

  /**
   * サブドメインを取得する
   */
  static getSubdomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = this.normalizeHostname(urlObj.hostname);
      const eTLDPlusOne = this.getETLDPlusOne(url);
      
      if (hostname === eTLDPlusOne) {
        return '';
      }
      
      return hostname.replace(`.${eTLDPlusOne}`, '');
    } catch {
      return '';
    }
  }

  /**
   * ドメインソート用のキーを生成する
   */
  static getDomainSortKey(url: string): string[] {
    try {
      const eTLDPlusOne = this.getETLDPlusOne(url);
      const subdomain = this.getSubdomain(url);
      const path = new URL(url).pathname;
      
      return [
        eTLDPlusOne.toLowerCase(),
        subdomain.toLowerCase(),
        path.toLowerCase()
      ];
    } catch {
      return ['', '', ''];
    }
  }

  /**
   * 特殊URLかどうかを判定する
   */
  static isSpecialUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.toLowerCase();
      
      return protocol === 'chrome:' || 
             protocol === 'chrome-extension:' ||
             protocol === 'moz-extension:' ||
             protocol === 'edge:' ||
             protocol === 'about:' ||
             protocol === 'data:' ||
             protocol === 'file:';
    } catch {
      return false;
    }
  }

  /**
   * URLのパス部分を取得する
   */
  static getPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return '';
    }
  }

  /**
   * URLのクエリパラメータを取得する
   */
  static getQuery(url: string): string {
    try {
      return new URL(url).search;
    } catch {
      return '';
    }
  }

  /**
   * URLのフラグメントを取得する
   */
  static getFragment(url: string): string {
    try {
      return new URL(url).hash;
    } catch {
      return '';
    }
  }
}
