export class LinkdingApi {
  constructor(configuration) {
    this.configuration = configuration;
  }

  async getBookmark(bookmarkId) {
    const configuration = this.configuration;

    return fetch(
      `${configuration.baseUrl}/api/bookmarks/${bookmarkId}/`,
      {
        headers: {
          Authorization: `Token ${configuration.token}`,
        },
      }
    ).then((response) => {
      if (response.status === 200) {
        return response.json();
      }
      return Promise.reject(
        `Error retrieving bookmark: ${response.statusText}`
      );
    });
  }

  async saveBookmark(bookmark) {
    const configuration = this.configuration;

    return fetch(`${configuration.baseUrl}/api/bookmarks/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${configuration.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookmark),
    }).then((response) => {
      if (response.status === 201) {
        return response.json();
      } else if (response.status === 400) {
        return response
          .json()
          .then((body) =>
            Promise.reject(`Validation error: ${JSON.stringify(body)}`)
          );
      } else {
        return Promise.reject(`Request error: ${response.statusText}`);
      }
    });
  }

  async getActiveNote() {
    // Get the first note that has the #active tag
    const configuration = this.configuration;

    return fetch(
      `${configuration.baseUrl}/api/bookmarks/?limit=1&q=%23active`,
      {
        headers: {
          Authorization: `Token ${configuration.token}`,
          "Content-Type": "application/json",
        }
      }).then((response) => {
        if (response.status === 200) {
          return response.json().then((body) => {
            if (body.count == 0) return null; // no active note
            return body.results[0];
          });
        }
        return Promise.reject(
          `Error retrieving active note: ${response.statusText}`
        );
      });
  }

  /**
   * Remove "#active" tag from all notes and set the active note
   * @param {int} noteID 
   */
  async setActiveNote(noteID) {
    const configuration = this.configuration;

    const resp = await fetch(
      `${configuration.baseUrl}/api/bookmarks/?q=%23active&limit=1`,
      {
        headers: {
          Authorization: `Token ${configuration.token}`,
          "Content-Type": "application/json",
        }
      })
    const json = await resp.json();

    if (json.count > 0) {
      const activeBookmark = json.results[0];
      activeBookmark.tag_names = activeBookmark.tag_names.filter(tag => tag !== "active");

      // Remove #active tag from active note
      console.log("Removing #active tag from note", activeBookmark.id);
      await fetch(
        `${configuration.baseUrl}/api/bookmarks/${activeBookmark.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Token ${configuration.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(activeBookmark),
        })

    } else {
      console.log("No active note to remove #active tag from")
    }

    // Set the active note
    console.log("Setting note as active", noteID);
    const bookmark = await this.getBookmark(noteID);
    bookmark.tag_names.push("active");

    return fetch(
      `${configuration.baseUrl}/api/bookmarks/${noteID}/`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${configuration.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookmark)
      }).then(async (response) => {
        if (response.status === 200) {
          return response.json();
        } else if (response.status === 400) {
          const body = await response
            .json();
          return await Promise.reject(`Validation error: ${JSON.stringify(body)}`);
        } else {
          return Promise.reject(`Request error: ${response.statusText}`);
        }
      });
  }

  async updateBookmark(bookmarkId, bookmark) {
    const configuration = this.configuration;

    return fetch(
      `${configuration.baseUrl}/api/bookmarks/${bookmarkId}/`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${configuration.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookmark),
      }).then((response) => {
        if (response.status === 200) {
          return response.json();
        } else if (response.status === 400) {
          return response
            .json()
            .then((body) =>
              Promise.reject(`Validation error: ${JSON.stringify(body)}`)
            );
        } else {
          return Promise.reject(`Request error: ${response.statusText}`);
        }
      });
  }

  async getTags() {
    const configuration = this.configuration;

    return fetch(`${configuration.baseUrl}/api/tags/?limit=1000`, {
      headers: {
        Authorization: `Token ${configuration.token}`,
      },
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((body) => body.results);
      }
      return Promise.reject(`Error loading tags: ${response.statusText}`);
    });
  }

  async search(text, options) {
    const configuration = this.configuration;
    const q = encodeURIComponent(text);
    const limit = options.limit || 100;

    return fetch(
      `${configuration.baseUrl}/api/bookmarks/?q=${q}&limit=${limit}`,
      {
        headers: {
          Authorization: `Token ${configuration.token}`,
        },
      }
    ).then((response) => {
      if (response.status === 200) {
        return response.json().then((body) => body.results);
      }
      return Promise.reject(
        `Error searching bookmarks: ${response.statusText}`
      );
    });
  }

  async check(url) {
    const configuration = this.configuration;
    url = encodeURIComponent(url);

    return fetch(
      `${configuration.baseUrl}/api/bookmarks/check/?url=${url}`,
      {
        headers: {
          Authorization: `Token ${configuration.token}`,
        },
      }
    ).then((response) => {
      if (response.status === 200) {
        return response.json();
      }
      return Promise.reject(
        `Error checking bookmark URL: ${response.statusText}`
      );
    });
  }

  async getUserProfile() {
    const configuration = this.configuration;

    return fetch(`${configuration.baseUrl}/api/user/profile/`, {
      headers: {
        Authorization: `Token ${configuration.token}`,
      },
    }).then((response) => {
      if (response.status === 200) {
        return response.json();
      }
      return Promise.reject(
        `Error retrieving user profile: ${response.statusText}`
      );
    });
  }

  async testConnection() {
    const configuration = this.configuration;
    return fetch(`${configuration.baseUrl}/api/bookmarks/?limit=1`, {
      headers: {
        Authorization: `Token ${configuration.token}`,
      },
    })
      .then((response) =>
        response.status === 200 ? response.json() : Promise.reject(response)
      )
      .then((body) => !!body.results)
      .catch(() => false);
  }
}
