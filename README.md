# Biarri - Front End Dev Challenge

## Demo

[View the demo](https://so-rostering-app.surge.sh)

## How to build project

1. Run `npm install` in the root directory
2. Run `npm run start` to start the dev server
3. Run `npm run watch-css` to compile the SCSS to CSS in /src/assets/styles/

## Tasks

 *The app should use React as a base framework - any library choices beyond this are up to you.*
The app uses Create React App as a base, MomentJS for time formatting (and timezone), and stores the data in JSONstore.io

 *The app should display the whole week of rostering information for the employees in the mock data set.*
Displays a week from Sunday. Configure this in App.js:53-61.

 *The roster must be represented in both a tabular format, and also a visualisation of some form - we're looking for something that would aid end users in understanding the information they're being presented with.*
There's a table format plus a daily hours breakdown below it. Didn't get time to finish off the second visualisation (plus some bugs) but home that's alright. Desktop-only, no mobile view yet

*The data provides DateTimes in UTC, but the configuration will specify a timezone property - make sure that you're using this to format your date times! We want to see the data in the context of their timezone, not your local time zone.*
Moment.js handles the timezone, you can change the timezone in the config and the roster will adjust. Seems like role names were meant for UTC (eg. Night runs from 5am-1:30pm in GMT+8).

*The ability to edit the start/end times of a shift (you do not need to be able to edit any additional data, create or delete shifts)*
Click a shift to edit it start and end time. Definately better ways to dispatch the event but good enough for this purpose.


