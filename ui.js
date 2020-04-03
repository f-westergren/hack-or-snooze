$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $favoritedArticles = $('#favorited-articles')
  const $userArticles = $('#my-articles')
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $('#nav-favorites')
  const $navUserArticles = $('#nav-my-stories')
  const $userProfileInfo = $('#user-profile')

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  const show = ($element) => {
    if ($element.is(':hidden')) {
      $element.show()
    }
  }

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance

    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    hideElements()
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
  });

  $navFavorites.on("click", async function() {
    const favorites = currentUser.favorites
    await updateCurrentUser()
    await generateFavorites(favorites)
    hideElements()
    show($favoritedArticles)
  });

  $navUserArticles.on("click", async function() {
    await updateCurrentUser()
    await generateUserArticles()
    hideElements()
    $('#my-articles').find('.hidden').show()
    show($userArticles)
  });

  $navSubmit.on("click", function() {
    hideElements()
    $submitForm.slideToggle();
    show($allStoriesList)
  });

  $submitForm.on("submit", async function(evt) {
    evt.preventDefault()
    
    // grab the required fields
    let user = localStorage.token
    let newStory = {
      author: $('#author').val(),
      title: $('#title').val(),
      url: $('#url').val()
    }
    // call the createStory method, which calls the API and then appends the story to the DOM.
    await StoryList.addStory(user, newStory)
    generateStories()
    createAndSubmitForm()
  })

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    show($allStoriesList)
  });

  $("body").on("click", "i", async function(evt) {
    evt.preventDefault()

    const token = currentUser.loginToken
    const user = currentUser.username
    const storyId = $(this).parent().attr('id')
    

    if ($(this).attr('class') === 'far fa-star') {
      await User.addFavorite(token, user, storyId)
      $(this).attr('class', 'fas fa-star')
      
    }
    else if ($(this).attr('class') === 'fas fa-star') {
      await User.removeFavorite(token, user, storyId)
      $(this).attr('class', 'far fa-star')
    }

    else if ($(this).attr('id') === `trash-${storyId}`) {
      await StoryList.removeStory(token, storyId)
      hideElements()
      await generateStories()
      $allStoriesList.show()
    }

  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {

    updateCurrentUser()

    if ($allStoriesList.has('li').length === 0) { await generateStories() }
    if (currentUser) { showNavForLoggedInUser() } 
  }

  async function updateCurrentUser() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  function createAndSubmitForm() {
    // hide the forms for logging in and signing up
    $submitForm.slideToggle();
  
    // reset those forms
    $submitForm.trigger("reset");
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {

    await updateCurrentUser()
    
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  async function generateFavorites() {

    updateCurrentUser()

    const userFavorites = currentUser.favorites

    // update our global variable
    // empty out that part of the page
    $favoritedArticles.empty();

    // loop through all of our stories and generate HTML for them
    if (userFavorites.length > 0) {
      for (let story of userFavorites) {
        const result = generateStoryHTML(story);
        $favoritedArticles.append(result);
      }
    } else {
      $favoritedArticles.html('<p>You have no favorited stories.</p>')
    }
  }

  async function generateUserArticles() {

    const userStories = currentUser.ownStories
    // update our global variable
    // empty out that part of the page
    $userArticles.empty();

    // loop through all of our stories and generate HTML for them
    if (userStories.length > 0) {
      for (let story of userStories) {
        const result = generateStoryHTML(story);
        $userArticles.append(result);
      }
    } else {
      $userArticles.append('<p>You have not submitted any stories.</p>')
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starClass = "far fa-star"

    if (currentUser) {
      const favorites = currentUser.favorites
      const favoritesIds = favorites.map(story => story.storyId)
      
      if (favoritesIds.includes(story.storyId)) {
        starClass = "fas fa-star"
      }
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <i class="fas fa-trash-alt hidden" id="trash-${story.storyId}"></i>
      <i class="${starClass}" id="favorite-${story.storyId}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small> 
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        
      </li>
    `);


    
    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedArticles,
      $userProfileInfo
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    show($('.nav-left'))
    show($("#nav-welcome"))
    $("#nav-user-profile").html(`<b>${currentUser.username}</b>`)
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
