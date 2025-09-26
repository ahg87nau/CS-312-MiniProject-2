const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// ====== Config ======
const WEATHER_API_KEY = "0ffb537f8a81d52df09319a6a4c49db9"; 

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// ================================
// Scraper: NAU Football Schedule
// ================================
async function fetchNAUSchedule() {
  try {
    const resp = await axios.get(
      'https://www.espn.com/college-football/team/schedule/_/id/2464/northern-arizona-lumberjacks'
    );
    const $ = cheerio.load(resp.data);

    const schedule = [];
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 3) {
        const date = $(cols[0]).text().trim();
        const opponent = $(cols[1]).text().trim();
        const result = $(cols[2]).text().trim() || 'TBD';
        if (date && opponent) {
          schedule.push({ date, opponent, result });
        }
      }
    });

    return schedule;
  } catch (err) {
    console.error('Error scraping NAU schedule:', err.message);
    return [];
  }
}

// ================================
// Weather API (2.5 endpoint)
// ================================
async function fetchWeather(city = 'Flagstaff,US') {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=imperial`;
    const resp = await axios.get(url);
    return resp.data;
  } catch (err) {
    console.error('Error fetching weather:', err.message);
    return null;
  }
}

// ================================
// Home Page
// ================================
app.get('/', async (req, res) => {
  try {
    const schedule = await fetchNAUSchedule();
    const weather = await fetchWeather();
    res.render('index', { schedule, weather });
  } catch (err) {
    console.error('Error fetching data for index page:', err.message);
    res.render('index', { schedule: [], weather: null });
  }
});

// ================================
// Cocktail + Meal Pairing
// ================================
app.get('/result', async (req, res) => {
  try {
    const cocktailRes = await axios.get('https://www.thecocktaildb.com/api/json/v1/1/random.php');
    const mealRes = await axios.get('https://www.themealdb.com/api/json/v1/1/random.php');

    const cocktailData = cocktailRes.data.drinks[0];
    const mealData = mealRes.data.meals[0];

    const cocktail = {
      name: cocktailData.strDrink,
      category: cocktailData.strCategory,
      glass: cocktailData.strGlass,
      alcoholic: cocktailData.strAlcoholic,
      instructions: cocktailData.strInstructions,
      thumbnail: cocktailData.strDrinkThumb,
      ingredients: []
    };

    for (let i = 1; i <= 15; i++) {
      const ingredient = cocktailData[`strIngredient${i}`];
      const measure = cocktailData[`strMeasure${i}`];
      if (ingredient) cocktail.ingredients.push({ name: ingredient, measure: measure || '' });
    }

    const meal = {
      name: mealData.strMeal,
      category: mealData.strCategory,
      area: mealData.strArea,
      instructions: mealData.strInstructions,
      thumbnail: mealData.strMealThumb,
      ingredients: []
    };

    for (let i = 1; i <= 20; i++) {
      const ingredient = mealData[`strIngredient${i}`];
      const measure = mealData[`strMeasure${i}`];
      if (ingredient) meal.ingredients.push({ name: ingredient, measure: measure || '' });
    }

    res.render('result', { cocktail, meal });
  } catch (error) {
    res.send('Error fetching data. Please try again.');
  }
});

// ================================
// Category Selection
// ================================
app.get('/category', async (req, res) => {
  try {
    const categoriesRes = await axios.get('https://www.thecocktaildb.com/api/json/v1/1/list.php?c=list');
    const categories = categoriesRes.data.drinks.map(d => d.strCategory);
    res.render('category', { categories });
  } catch (error) {
    res.send('Error fetching categories. Please try again.');
  }
});

app.post('/category-result', async (req, res) => {
  const { category } = req.body;
  try {
    const cocktailListRes = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
    const cocktails = cocktailListRes.data.drinks;

    const randomCocktail = cocktails[Math.floor(Math.random() * cocktails.length)];
    const cocktailDetailRes = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${randomCocktail.idDrink}`);
    const cocktailData = cocktailDetailRes.data.drinks[0];

    const cocktail = {
      name: cocktailData.strDrink,
      category: cocktailData.strCategory,
      glass: cocktailData.strGlass,
      alcoholic: cocktailData.strAlcoholic,
      instructions: cocktailData.strInstructions,
      thumbnail: cocktailData.strDrinkThumb,
      ingredients: []
    };

    for (let i = 1; i <= 20; i++) {
      const ingredient = cocktailData[`strIngredient${i}`];
      const measure = cocktailData[`strMeasure${i}`];
      if (ingredient) cocktail.ingredients.push({ name: ingredient, measure: measure || '' });
    }

    const mealRes = await axios.get('https://www.themealdb.com/api/json/v1/1/random.php');
    const mealData = mealRes.data.meals[0];

    const meal = {
      name: mealData.strMeal,
      category: mealData.strCategory,
      area: mealData.strArea,
      instructions: mealData.strInstructions,
      thumbnail: mealData.strMealThumb,
      ingredients: []
    };

    for (let i = 1; i <= 20; i++) {
      const ingredient = mealData[`strIngredient${i}`];
      const measure = mealData[`strMeasure${i}`];
      if (ingredient) meal.ingredients.push({ name: ingredient, measure: measure || '' });
    }

    res.render('result', { cocktail, meal });
  } catch (error) {
    res.send('Error fetching category results. Please try again.');
  }
});

// ================================
// Server
// ================================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
