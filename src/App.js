import React, { Component } from 'react';
import './assets/styles/App.css';

// Load some utility functions
import {
  convertDatesToTimestamp,
  compareDates,
  countShifts,
  countHours
} from './lib/utils';

// For time manipulation
import Moment from 'react-moment';
import moment from 'moment';
import 'moment-timezone';

// Gets updated in render from the config, so can set any timezone as default here
Moment.globalTimezone = 'Australia/Perth';
//Moment.globalTimezone = 'Europe/London';

// Connecting to JSONstore as an endpoint. Alternatively, remove the fetch and get the data from a local file:
// import data from './roster.json';
const dataEndpoint =
  'https://www.jsonstore.io/e03b22da584e6023a95f3deb34b6adecf94b586f2a7735c6c44d3f500ccaae7e'; // Backup: https://www.jsonstore.io/3e58826123188f9af683971e8bb335355df8725f7237159bd41c060ee76d4dc5

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      config: {},
      employees: {},
      roles: {},
      shifts: {},
      roster: [],
      thisWeek: [],
      editingId: 61574
    };

    this.updateEditingId = this.updateEditingId.bind(this);
    this.updateShiftTime = this.updateShiftTime.bind(this);
  }

  componentDidMount() {
    // Populate the data from a JSON endpoint before component mounts
    fetch(dataEndpoint, {
      headers: { 'Content-type': 'application/json' },
      method: 'GET'
    })
      .then(response => response.json())
      .then(data => {
        // Parse dates and order shifts by their start date
        let orderedShifts = convertDatesToTimestamp(data.result.shifts);
        orderedShifts.sort(compareDates);

        // Render from start day
        const firstShift = orderedShifts[0].start_time;
        let thisWeek = [];

        // Populate 1 week headers
        for (let i = 0; i < 7; i++) {
          // First shift might not always start on Sunday
          const dayOffset = i - firstShift.day();
          thisWeek.push(moment(firstShift).add(dayOffset, 'days'));
        }

        /*
        Build a new array of the weekly roster
        Roster
          - Employee
            - Day of the week
              - Shift IDs (styled with role)

        TODO: Move this out of componentDidMount to its own function
        */

        let roster = [];
        for (let i = 0; i < data.result.employees.length; i++) {
          let employee = data.result.employees[i];
          employee.days = [];

          for (let j = 0; j < thisWeek.length; j++) {
            let day = [];
            day.date = thisWeek[j]; // Set the day's date
            day.shifts = []; // Store shifts here

            for (let k = 0; k < orderedShifts.length; k++) {
              let shift = orderedShifts[k];

              // Shift belongs to employee and is scheduled today
              if (
                employee.id === shift.employee_id &&
                shift.start_time.format('YYYY-MM-DD') ===
                  day.date.format('YYYY-MM-DD')
              ) {
                // Reference the shift by ID
                day.shifts.push(shift.id);
              }
            }

            employee.days.push(day);
          }

          roster.push(employee);
        }

        // Set inital state from data
        this.setState({
          config: data.result.config,
          employees: data.result.employees,
          roles: data.result.roles,
          shifts: orderedShifts,
          roster: roster,
          thisWeek: thisWeek
        });
      });
  }

  // Change the current shift ID when. Trigger: a shift is clicked
  updateEditingId(id) {
    this.setState({
      editingId: id
    });
  }

  // Change the start or end time of a shift. Trigger: a shift time is changed
  updateShiftTime(shifts) {
    this.setState({
      shifts: shifts
    });

    // Now we can just post this new shift data to JSONstore to update the source
    /*
    fetch(dataEndpoint + '/shifts/', {
      headers: {
        'Content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(shifts)
    })
    .then(response => response.json())
    .then(data => {
      // Data updated. Set state here on callback instead of above
      console.log('Saved')
    }); 
    */
  }

  render() {
    if (!this.state.config.location) {
      return <div className="loading">Loading...</div>;
    }

    // Set global timezone from config
    Moment.globalTimezone = this.state.config.timezone;
    const currentTime = moment();

    // Highlight the current day
    const checkIfToday = day => {
      // Replace current time with '2018-06-20' to see this work
      if (day.format('YYYY-MM-DD') === currentTime.format('YYYY-MM-DD')) {
        return 'today';
      }
    };

    // Output the days in the header
    const weekdayHeaders = this.state.thisWeek.map((day, index) => (
      <React.Fragment key={day}>
        <th className={checkIfToday(day)}>
          <Moment format="ddd">{day}</Moment>{' '}
          <small>
            <Moment format="D MMM">{day}</Moment>
          </small>
        </th>
      </React.Fragment>
    ));

    // Build the roster table
    const rosterTable = this.state.roster.map((employee, i) => (
      <React.Fragment key={employee.id}>
        <EmployeeRow
          employee={employee}
          shifts={this.state.shifts}
          roles={this.state.roles}
          editingId={this.updateEditingId}
        />
      </React.Fragment>
    ));

    // Legend colours for shifts
    const rosterLegend = this.state.roles.map((role, index) => {
      const style = {
        backgroundColor: role.background_colour,
        color: role.text_colour
      };

      return (
        <React.Fragment key={role.id}>
          <li style={style} className={'role-' + role.id}>
            {role.name}
          </li>
        </React.Fragment>
      );
    });

    return (
      <div className="roster-">
        <header className="roster-header">
          <h1>Roster for {this.state.config.location}</h1>
          <p>
            All shifts are in{' '}
            <strong>{this.state.config.timezone.split('/')[1]}</strong> time ({
              this.state.config.timezone.split('/')[0]
            }{' '}
            GMT<Moment format="Z">{currentTime}</Moment>)
          </p>
        </header>

        <ul className="roster-legend">
          <li>Type of shift:</li> {rosterLegend}
        </ul>

        <div className="table-wrap">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Employee</th>
                {weekdayHeaders}
              </tr>
            </thead>

            <tbody>{rosterTable}</tbody>
          </table>
        </div>

        <EmployeeTimetable
          employee={this.state.employees[8]}
          shifts={this.state.shifts}
          roles={this.state.roles}
          headers={weekdayHeaders}
          timezone={this.state.config.timezone}
        />

        <div id="open-modal" className="modal-window">
          <div>
            <a href="#modal-close" title="Close" className="modal-close">
              Close
            </a>
            <EmployeeEditShift
              shiftId={this.state.editingId}
              shifts={this.state.shifts}
              shiftIndex={this.state.shifts.findIndex(
                x => x.id === this.state.editingId
              )}
              timezone={this.state.config.timezone}
              updateShift={this.updateShiftTime}
            />
          </div>
        </div>
      </div>
    );
  }
}

class EmployeeRow extends React.Component {
  render() {
    const employeeDays = this.props.employee.days.map((day, i) => (
      <React.Fragment key={day.date + '-' + i}>
        <EmployeeDay
          day={day}
          shifts={this.props.shifts}
          roles={this.props.roles}
          id={this.props.employee.id}
          updateShiftType={this.updateShiftType}
          editingId={(id) => this.props.editingId(id)}
        />
      </React.Fragment>
    ));

    return (
      <tr>
        <td>
          <h4>
            {this.props.employee.first_name} {this.props.employee.last_name}
          </h4>
          <small>
            {countShifts(this.props.employee.days)} shifts ({countHours(
              this.props.employee.days,
              this.props.shifts
            )})
          </small>
        </td>
        {employeeDays}
      </tr>
    );
  }
}

class EmployeeDay extends React.Component {
  render() {
    const shiftList = this.props.day.shifts.map((shiftId, i) => {
      const shift = this.props.shifts.filter(shift => {
        return shift.id === shiftId;
      })[0];

      // Get the role for styles and class name
      const role = this.props.roles.filter(role => {
        return role.id === shift.role_id;
      })[0];

      const style = {
        backgroundColor: role.background_colour,
        color: role.text_colour
      };

      // TODO: If shift runs onto next day, display shift on next day too
      let shiftType = '';
      if (
        shift.end_time.format('YYYY-MM-DD') >
        shift.start_time.format('YYYY-MM-DD')
      ) {
        // Shifts that start today and end tomorrow
        shiftType = 'nextDay';
      }

      return (
        <React.Fragment key={shift.id}>
          <EmployeeShift
            shift={shift}
            shiftType={shiftType}
            style={style}
            role={role}
            onClick={() => this.props.editingId(shift.id)}
          />
        </React.Fragment>
      );
    });

    return <td>{shiftList}</td>;
  }
}

class EmployeeShift extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      startFormat: this.props.shiftType === 'prevDay' ? 'h:mma (ddd)' : 'h:mma',
      endFormat: this.props.shiftType === 'nextDay' ? 'h:mma (ddd)' : 'h:mma'
    };
  }

  render() {
    // TODO: Replace onClick with an event dispatch to pass ID to editing component directly. Simplify passing up to parents
    return (
      <a
        href="#open-modal"
        title="Edit shift times"
        style={this.props.style}
        className={this.props.shiftType + ' role-' + this.props.role.id}
        onClick={() => this.props.onClick()}
      >
        <Moment format={this.state.startFormat}>
          {this.props.shift.start_time}
        </Moment>{' '}
        -
        <Moment format={this.state.endFormat}>
          {this.props.shift.end_time}
        </Moment>
      </a>
    );
  }
}

class EmployeeEditShift extends React.Component {
  constructor(props) {
    super(props);

    this.changeStartTime = this.changeStartTime.bind(this);
    this.changeEndTime = this.changeEndTime.bind(this);
  }

  // Update time on input change
  changeStartTime(e) {
    const time = moment(e.target.value, 'hh:mm');
    let newShift = Object.assign({}, this.props.shifts[this.props.shiftIndex]);
    newShift.start_time.set({ h: time.get('hour'), m: time.get('minute') });

    this.handleChange(newShift);
  }

  changeEndTime(e) {
    const time = moment(e.target.value, 'hh:mm');
    let newShift = Object.assign({}, this.props.shifts[this.props.shiftIndex]);
    newShift.end_time.set({ h: time.get('hour'), m: time.get('minute') });

    this.handleChange(newShift);
  }

  // Change the prop to trigger parent update
  handleChange(newShift) {
    let newShifts = this.props.shifts.slice(0);
    this.props.updateShift(newShifts);
  }

  render() {
    const shift = this.props.shifts[this.props.shiftIndex];

    // Set the timezone from parent
    const startTime = shift.start_time.tz(this.props.timezone);
    const endTime = shift.end_time.tz(this.props.timezone);

    return (
      <div className="roster-edit">
        <h3>Edit shift #{this.props.shiftId}</h3>
        <div>
          <label for="start_time">
            Start time <small>{startTime.format('h:mma')}</small>
          </label>
          <input
            type="time"
            id="start_time"
            name="start_time"
            step="900"
            value={startTime.format('HH:mm')}
            onChange={this.changeStartTime}
          />
        </div>
        <div>
          <label for="end_time">
            End time <small>{endTime.format('h:mma')}</small>
          </label>
          <input
            type="time"
            id="end_time"
            name="end_time"
            step="900"
            value={endTime.format('HH:mm')}
            onChange={this.changeEndTime}
          />
        </div>
      </div>
    );
  }
}

// A second visualisation - show shifts by hours for each employee
// TODO: select box to pick and change employee
class EmployeeTimetable extends React.Component {
  render() {
    const dayBlock = this.props.employee.days.map((day, index) => (
      <div key={day.date}>
        <h3>
          <Moment format="ddd">{day.date}</Moment>
        </h3>
        <ol>
        <React.Fragment>
          <EmployeeTimetableDay todayShifts={day.shifts} shifts={this.props.shifts} roles={this.props.roles} timezone={this.props.timezone} />
        </React.Fragment>
        </ol>
      </div>
    ));

    return (
      <div className="timetable">
        <h2>Daily roster for <strong>{this.props.employee.first_name + ' ' + this.props.employee.last_name}</strong></h2>
        <div className="grid roster-timetable">
          <div>
            <h3>Time</h3>
            <ol>
              <li>12am - 1am</li>
              <li>1am - 2am</li>
              <li>2am - 3am</li>
              <li>3am - 4am</li>
              <li>4am - 5am</li>
              <li>5am - 6am</li>
              <li>6am - 7am</li>
              <li>7am - 8am</li>
              <li>8am - 9am</li>
              <li>9am - 10am</li>
              <li>10am - 11am</li>
              <li>11am - 12pm</li>
              <li>12pm - 1pm</li>
              <li>1pm - 2pm</li>
              <li>2pm - 3pm</li>
              <li>3pm - 4pm</li>
              <li>4pm - 5pm</li>
              <li>5pm - 6pm</li>
              <li>6pm - 7pm</li>
              <li>7pm - 8pm</li>
              <li>8pm - 9pm</li>
              <li>9pm - 10pm</li>
              <li>9pm - 11pm</li>
              <li>10pm - 11pm</li>
              <li>11pm - 12am</li>
            </ol>
          </div>
          {dayBlock} 
        </div>
      </div>
    );
  }
}

class EmployeeTimetableDay extends React.Component {
  render() {
    const timeBlock = this.props.todayShifts.map((shiftId, i) => {

      const shift = this.props.shifts.filter(shift => {
        return shift.id === shiftId;
      })[0];

      // Get the role for styles and class name
      const role = this.props.roles.filter(role => {
        return role.id === shift.role_id;
      })[0];


      // Bug: these aren't being offset correctly. Change to duration in minutes to capture half hours
      const startTime = shift.start_time.tz(this.props.timezone);
      const endTime = shift.end_time.tz(this.props.timezone);
      let timeFormat = 'h:mma';

      const offset = startTime.format('H');
      let duration = endTime.format('H') - startTime.format('H');

      //const offset = moment.duration((startTime.startOf('day')).diff(startTime)).asMinutes();
      //const nextDay = (endTime.format('H') - startTime.format('H') > 0) ? true : false;
      //let duration = moment.duration(endTime.diff(startTime)).asMinutes();

      // Ends next day to extend to midnight
      if (duration < 0) {
        duration = 25 - offset;
        timeFormat = 'h:mma \(ddd\)';
      }

      const style = {
        backgroundColor: role.background_colour,
        color: role.text_colour,
        marginTop: (offset * 3) + 'em',
        height: (duration * 3) + 'em',
      };

      return (
        <React.Fragment key={shift.id}>
          <li style={style}>
            <div>
              <Moment format={timeFormat}>
              {startTime}
            </Moment>{' '}
            -{' '}
            <Moment format={timeFormat}>
              {endTime}
            </Moment>
            </div>
        </li>
        </React.Fragment>
      );
    });    

    return (
      <React.Fragment>
      {timeBlock}
      </React.Fragment>
    );
  }
}

export default App;
