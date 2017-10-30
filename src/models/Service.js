import { computed, observable } from 'mobx';
import path from 'path';
import normalizeUrl from 'normalize-url';

export default class Service {
  id = '';
  recipe = '';
  webview = null;
  events: {};

  isAttached = false;

  @observable isActive = false; // Is current webview active

  @observable name = '';
  @observable unreadDirectMessageCount = 0;
  @observable unreadIndirectMessageCount = 0;

  @observable order = 99;
  @observable isEnabled = true;
  @observable team = '';
  @observable customUrl = '';
  @observable isNotificationEnabled = true;
  @observable isIndirectMessageBadgeEnabled = true;
  @observable customIconUrl = '';

  constructor(data, recipe) {
    if (!data) {
      console.error('Service config not valid');
      return null;
    }

    if (!recipe) {
      console.error('Service recipe not valid');
      return null;
    }

    this.id = data.id || this.id;
    this.name = data.name || this.name;
    this.team = data.team || this.team;
    this.customUrl = data.customUrl || this.customUrl;
    this.customIconUrl = data.customIconUrl || this.customIconUrl;

    this.order = data.order !== undefined
      ? data.order : this.order;

    this.isEnabled = data.isEnabled !== undefined
      ? data.isEnabled : this.isEnabled;

    this.isNotificationEnabled = data.isNotificationEnabled !== undefined
      ? data.isNotificationEnabled : this.isNotificationEnabled;

    this.isIndirectMessageBadgeEnabled = data.isIndirectMessageBadgeEnabled !== undefined
      ? data.isIndirectMessageBadgeEnabled : this.isIndirectMessageBadgeEnabled;

    this.recipe = recipe;
  }

  @computed get url() {
    if (this.recipe.hasCustomUrl && this.customUrl) {
      let url = normalizeUrl(this.customUrl);

      if (typeof this.recipe.buildUrl === 'function') {
        url = this.recipe.buildUrl(url);
      }

      return url;
    }

    if (this.recipe.hasTeamId && this.team) {
      return this.recipe.serviceURL.replace('{teamId}', this.team);
    }

    return this.recipe.serviceURL;
  }

  @computed get icon() {
    if (this.hasCustomIcon) {
      return this.customIconUrl;
    }

    return path.join(this.recipe.path, 'icon.svg');
  }

  @computed get hasCustomIcon() {
    return (this.customIconUrl !== '');
  }

  @computed get iconPNG() {
    return path.join(this.recipe.path, 'icon.png');
  }

  @computed get userAgent() {
    let userAgent = window.navigator.userAgent;
    if (typeof this.recipe.overrideUserAgent === 'function') {
      userAgent = this.recipe.overrideUserAgent();
    }

    return userAgent;
  }

  initializeWebViewEvents(store) {
    this.webview.addEventListener('ipc-message', e => store.actions.service.handleIPCMessage({
      serviceId: this.id,
      channel: e.channel,
      args: e.args,
    }));

    this.webview.addEventListener('new-window', (event, url, frameName, options) => store.actions.service.openWindow({
      event,
      url,
      frameName,
      options,
    }));

    this.webview.addEventListener('crashed', (e) => {
      console.log(e);
      const reload = window.confirm('Service crashed. Reload?'); // eslint-disable-line no-alert
      if (reload) {
        store.actions.service.reload({
          serviceId: this.id,
        });
      }
    });
  }

  initializeWebViewListener() {
    if (this.webview && this.recipe.events) {
      Object.keys(this.recipe.events).forEach((eventName) => {
        const eventHandler = this.recipe[this.recipe.events[eventName]];
        if (typeof eventHandler === 'function') {
          this.webview.addEventListener(eventName, eventHandler);
        }
      });
    }
  }

  resetMessageCount() {
    this.unreadDirectMessageCount = 0;
    this.unreadIndirectMessageCount = 0;
  }
}
