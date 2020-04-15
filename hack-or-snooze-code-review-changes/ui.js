$(async function () {
  const $allStoriesList = $("#all-stories-list");
  const $favoritedStories = $("#favorited-stories");
  const $userStories = $("#my-stories");
  const $submitForm = $("#submit-form");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $userProfileInfo = $("#user-profile");

  const config = {
    rootMargin: '0px 0px 50px 0px',
    threshold: 0
  }

  let loaded = 0

  let observer = new IntersectionObserver(function (entries, self) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        console.log(`Post ${entry.target} is in the viewport!`);
        preloadPost(entry.target)
        // Stop watching and load post
        self.unobserve(entry.target)
      }
    })
  }, config)

  $allStoriesList.children.forEach(post => {
    observer.observe(post)
  })

  function preloadPost(post) {
    const 
  }

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();
  console.log('hias')

  // Event handler for the navbar links
  $('.nav-link').on("click", async function () {
    await getCurrentUser()
    hideElements()

    const navId = $(this).attr('id')

    if (navId === 'nav-logout') {
      navLogOut()
    } else if (navId === 'nav-login') {
      navLogIn()
    } else if (navId === 'nav-favorites') {
      showFavorites()
    } else if (navId === 'nav-my-stories') {
      showUserStories()
    } else if (navId === 'nav-all') {
      showAllStories()
    } else if (navId === 'nav-submit') {
      showSubmitForm()
    }
  })
  
  // Functions for the navbar event handlers
  function navLogOut () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();    
  }

  function navLogIn () {
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
  }

  async function showFavorites() {
    await getCurrentUser();
    await generateFavorites();
    hideElements();
    $favoritedStories.show();
  }

  async function showUserStories() {
    await generateUserStories();
    $userStories.find(".fa-trash-alt").show(); // show trash icon when going to 'my stories'
    $userStories.show();
  }

  async function showAllStories() {
    await generateStories();
    $allStoriesList.show();
  }

  function showSubmitForm() {
    $submitForm.slideToggle();
    $allStoriesList.show();
  }
  
  //Event listeners for logging in, creating new account, and submitting new story
  $loginForm.on("submit", (e) => userLogin(e)) 
  $createAccountForm.on("submit", (e) => createAccountForm(e)) 
  $submitForm.on("submit", (e) => submitNewStory(e)) 
  
  async function userLogin (e) {
    e.preventDefault(); 

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();
    
    try {
      // call the login static method to build a user instance
      const userInstance = await User.login(username, password);

      // set the global user to the user instance
      currentUser = userInstance;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();

    } catch (e) {
      createErrorMessage($('#login-error'), 'Login failed.')
    }
  }

  async function createAccountForm (e) {
    e.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    try {
      const newUser = await User.create(username, password, name);
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (e) {
      if(e instanceof ValidationError)
        createErrorMessage($('#create-account-error'), `${e.message}`)
      else if(e instanceof DuplicatedError){
        createErrorMessage($('#create-account-error'), `${e.message}`)
        console.log(`Duplicated username : ${e.recordName}`);
      }
      else if (e instanceof BadResponseError){
        createErrorMessage($('#create-account-error'), `${e.message}`)
      }
      else{
        console.log(e.message);
      }
  }

  async function submitNewStory (e) {
    e.preventDefault();

    // grab the required fields
    let user = currentUser.loginToken;
    let newStory = {
      author: $("#author").val(),
      title: $("#title").val(),
      url: $("#url").val(),
    };

    // call the addStory method, which calls the API and then appends the story to the DOM.
    await StoryList.addStory(user, newStory);
    generateStories();
    createAndSubmitForm();
  }

  async function removeStoryInstance (token, storyId) {
    await StoryList.removeStory(token, storyId);
    hideElements();
    await generateStories();
    $allStoriesList.show();
  }

  // Event handler for clicking on star or trash icon
  $("body").on("click", "i", async function (evt) {
    evt.preventDefault();

    const token = currentUser.loginToken;
    const storyId = $(this).parent().attr("id");

    if ($(this).attr("class") === "far fa-star") { // If clicked on an outlined star, add favorite and change icon to filled star
      currentUser.addFavorite(storyId);
      $(this).attr("class", "fas fa-star");
    } else if ($(this).attr("class") === "fas fa-star") { // If clicked on a filled star, remove favorite and change icon to outlined star
      currentUser.removeFavorite(storyId);
      $(this).attr("class", "far fa-star");
    } else if ($(this).attr("id") === `trash-${storyId}`) { // If clicked on trash can, delete story and go back to main page
      removeStoryInstance(token, storyId)
    }
  });

  // On page load, checks local storage to see if the user is already logged in. Renders page information accordingly.
  async function checkIfLoggedIn() {
    getCurrentUser();
    await generateStories();
    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  // if there is a token in localStorage, call User.getLoggedInUser
  //  to get an instance of User with the right details
  // This will also run to update current user lists (favorites, mystories)
  async function getCurrentUser() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    currentUser = await User.getLoggedInUser(token, username);
  }

  // A rendering function to run to reset the forms and hide the login info
  function loginAndSubmitForm() {

    $loginForm.hide();
    $createAccountForm.hide();

    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  function createAndSubmitForm() {
    $submitForm.slideToggle();
    $submitForm.trigger("reset");
  }

  // A rendering function to call the StoryList.getStories static method, which will generate a storyListInstance. Then render it.
  async function generateStories() {
    await getCurrentUser();

    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance.stories;
    // empty out that part of the page
    $allStoriesList.empty();

    // function for looping through all of our stories and generate HTML for them
    createStoryHTML($allStoriesList, storyList);
  }

  // A rendering function for rendering the logged in user's favorite stories
  async function generateFavorites() {
    const userFavorites = currentUser.favorites;
    $favoritedStories.empty();

    // loop through all of our stories and generate HTML for them
    if (userFavorites.length > 0) {
      createStoryHTML($favoritedStories, userFavorites);
    } else {
      $favoritedStories.html("<p>You have no favorited stories.</p>");
    }
  }

  // A rendering function for creating the logged in user's own stories
  async function generateUserStories() {
    const userStories = currentUser.ownStories;
    $userStories.empty();

    // loop through all of our stories and generate HTML for them
    if (userStories.length > 0) {
      createStoryHTML($userStories, userStories);
    } else {
      $userStories.append("<p>You have not submitted any stories.</p>");
    }
  }

  // function for rendering multiple stories
  function createStoryHTML ($element, storyList) {
    for (let story of storyList) {
      const result = generateStoryHTML(story);
      $element.append(result);
    }
  }; 
  
  function addSingleStory(story) {
    $allStoriesList.append(generateStoryHTML(story))
  }

  // A function to render HTML for an individual Story instance
  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starIcon = "";

    // if user is logged in, add their favorited stories to the HTML
    if (currentUser) {
      const favorites = currentUser.favorites;
      const favoritesIds = favorites.map((story) => story.storyId);

      // if a storyId matches the id from the users list of favorites, update icon to be starred
      favoritesIds.includes(story.storyId)
        ? (starIcon = "fas fa-star")
        : (starIcon = "far fa-star");
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <i class="fas fa-trash-alt hidden trash-can" id="trash-${story.storyId}"></i>
      <i class="${starIcon}" id="favorite-${story.storyId}"></i>
        <a class="story-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="story-author">by ${story.author}</small> 
        <small class="story-hostname ${hostName}">(${hostName})</small>
        <small class="story-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  // Hide all elements in elementsArr 
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $userStories,
      $loginForm,
      $createAccountForm,
      $favoritedStories,
      $userProfileInfo,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $(".nav-left").show();
    $("#nav-welcome").show();
    $("#nav-user-profile").html(`<b>${currentUser.username}</b>`);
  }

  // Simple function to pull the hostname from a URL
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

  // Sync current user information to localStorage
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  // Function for creating error message for login and accoutn creation failures
  const createErrorMessage = ($element, message) => {
    $element.text(message)
    setTimeout(() => {$($element).text("")}, 3000)
  }
});
