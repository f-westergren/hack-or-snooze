const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com"

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  // Because once it fetches a new story that needs to be added by the class itself, so this
  // needs to be a method of the whole class, rather than a method of an individual storylist?

  static async getStories() {
    const response = await axios.get(`${BASE_URL}/stories`)

    if (!response.data.stories || !Array.isArray(response.data.stories)) {
      throw new Error('Invalid data from server')
    }

    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map((story) => new Story(story))

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories)
    return storyList
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  static async addStory(token, story) {
    const response = await axios.post(`${BASE_URL}/stories`, {token: token, story: story})
    const newStory = new Story(response)

    return newStory
  }

  static async removeStory(token, storyId) {
    await axios.delete(`${BASE_URL}/stories/${storyId}`, {params: {token: token}})
  }
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username
    this.name = userObj.name
    this.createdAt = userObj.createdAt
    this.updatedAt = userObj.updatedAt

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = ""
    this.favorites = []
    this.ownStories = []
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    let newUser;

    try{
      const response = await axios.post(`${BASE_URL}/signup`, {
        user: {
          username,
          password,
          name
        }
      });

      if(!response.data.user)
        throw new BadResponseError('Missing User field');
        
      // build a new User instance from the API response
      newUser = new User(response.data.user)

      // attach the token to the newUser instance for convenience
      newUser.loginToken = response.data.token

    }
    catch(e){
      if(e.response.status == 409)
        throw new DuplicatedError('Username already exists',username);
      else if(e.response.status == 400)
        throw new ValidationError(e.response.data.error.message, e.response.data.error.title);
    }
    

    return newUser
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {user: {username, password}})

    // build a new User instance from the API response
    const existingUser = new User(response.data.user)

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map((s) => new Story(s))
    existingUser.ownStories = response.data.user.stories.map((s) => new Story(s))

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token

    return existingUser
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {params: {token}})

    // instantiate the user from the API information
    const existingUser = new User(response.data.user)

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map((s) => new Story(s))
    existingUser.ownStories = response.data.user.stories.map((s) => new Story(s))

    return existingUser
  }

  async removeFavorite(storyId) {

    const token = this.loginToken
    await axios.delete(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {params: {token}})}

  async addFavorite(storyId) {
    const response = await axios.post(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {token: this.loginToken})

    return response
  }
}

/**
 * Class to represent a single story.
 */

class Story {
  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author
    this.title = storyObj.title
    this.url = storyObj.url
    this.username = storyObj.username
    this.storyId = storyObj.storyId
    this.createdAt = storyObj.createdAt
    this.updatedAt = storyObj.updatedAt
  }
}

class DuplicatedError extends Error {
	constructor(message, recordName) {
	  super(message);
    this.recordName = recordName;
    this.name = 'DuplicatedError';
	}
}

class ValidationError extends Error {
	constructor(message, title) {
    super(message);
    this.name = 'ValidationError';
    this.title = title;
	}
}

class BadResponseError extends Error{
  constructor(message){
    super(message);
    this.name = 'BadResponseError';
  }
}