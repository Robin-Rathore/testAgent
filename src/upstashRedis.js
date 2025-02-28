// upstashRedis.js
import fetch from 'node-fetch';

// Upstash REST API implementation
export class UpstashRedisClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.isReady = true;
  }

  async request(endpoint, method = 'GET', body = null) {
    const headers = {
      'Authorization': `Bearer ${this.token}`
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${this.url}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    
    return await response.json();
  }

  async lPush(key, value) {
    return this.request('/lpush', 'POST', {
      key,
      element: value
    });
  }

  async lRange(key, start, end) {
    return this.request(`/lrange/${key}/${start}/${end}`, 'GET');
  }

  async expire(key, seconds) {
    return this.request('/expire', 'POST', {
      key,
      ex: seconds
    });
  }
}