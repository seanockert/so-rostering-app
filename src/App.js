import React, { Component } from 'react';
import './assets/styles/App.css';

// Load some utility functions
import {
  convertDatesToTimestamp,
  compareDates,
  countShifts,
  countHours
} from './lib/utils';

import ff from './lib/friendlyFire';

// For time manipulation
import moment from 'moment';
import 'moment-timezone';

// Connecting to JSONstore as an endpoint. Alternatively, remove the fetch and get the data from a local file:
//import localData from './files/localData.json';
const dataEndpoint = 'https://www.jsonstore.io/4a5558704da6c0950f2183e603158ef8193fb1d0e051c2a6beb53a8693d2eef9';
/* Prefill data
  fetch(dataEndpoint, {
    headers: {
      'Content-type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(localData)
  })
  .then(response => response.json())
  .then(data => {

  }); 
*/

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      config: {},
      employees: {},
      roles: {},
      shifts: {},
      roster: [],
      thisWeek: []
    };

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
        console.log(data)
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
        let carryOverShift = null;
        for (let i = 0; i < data.result.employees.length; i++) {
          let employee = data.result.employees[i];
          employee.days = [];
          

          for (let j = 0; j < thisWeek.length; j++) {
            let day = [];
            day.date = thisWeek[j]; // Set the day's date
            day.shifts = []; // Store shifts here
            day.carryOverShifts = []; // Store shifts that carry over from previous day here

            for (let k = 0; k < orderedShifts.length; k++) {
              let shift = orderedShifts[k];

              // Shift belongs to employee and is scheduled today
              if (
                employee.id === shift.employee_id &&
                shift.start_time.get('date') ===
                  day.date.get('date')
              ) {
                // Reference the shift by ID
                day.shifts.push(shift.id);
 
                if (carryOverShift != null) {
                  day.carryOverShifts.push(carryOverShift);
                  //carryOverShift = null;
                }

                if (shift.end_time.get('date') > day.date.get('date')) {
                  carryOverShift = shift.id;
                }

              }
              console.log(carryOverShift)
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
    // Display loading until data is populated
    if (!this.state.config.location) {
      return <div className="loading">Loading...</div>;
    }

    // Set global timezone from config
    const timezone = this.state.config.timezone;
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
          {day.tz(timezone).format('ddd')}
          <small>{day.tz(timezone).format('D MMM')}</small>
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
          timezone={timezone}
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
            GMT{currentTime.tz(timezone).format('Z')})
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
              shifts={this.state.shifts}
              timezone={this.state.config.timezone}
              updateShift={this.updateShiftTime}
            />
          </div>
        </div>
      </div>
    );
  }
}

const EmployeeRow = props => {
  const { employee, shifts, roles, timezone } = props;

  const employeeDays = employee.days.map((day, i) => {
    //console.log(day.carryOverShifts)
    return (
      <React.Fragment key={day.date + '-' + i}>
        <EmployeeDay day={day} shifts={shifts} roles={roles} timezone={timezone} />
      </React.Fragment>
    )
  });

  return (
    <tr>
      <td>
        <h4>
          {employee.first_name} {employee.last_name}
        </h4>
        <small>
          {countShifts(employee.days)} shifts ({countHours(
            employee.days,
            shifts
          )})
        </small>
      </td>
      {employeeDays}
    </tr>
  );
};

const EmployeeDay = props => {
  const { day, shifts, roles, timezone } = props;

  const shiftList = day.shifts.map((shiftId, i) => {
    const shift = shifts.filter(shift => {
      return shift.id === shiftId;
    })[0];

    // Get the role for styles and class name
    const role = roles.filter(role => {
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
          timezone={timezone}
        />
      </React.Fragment>
    );
  });

  return <td>{shiftList}</td>;
};

class EmployeeShift extends React.Component {
  componentDidMount() {
    ff.init(this); // Register with FriendlyFire to make trigger(…) method available
  }

  // Send ID to the EmployeeEditShift component
  handleClick(id) {
    this.trigger('click', id);
  }

  render() {
    const { shift, shiftType, style, role, timezone } = this.props;

    const startFormat = shiftType === 'prevDay' ? 'h:mma (ddd)' : 'h:mma';
    const endFormat = shiftType === 'nextDay' ? 'h:mma (ddd)' : 'h:mma';

    return (
      <a
        href="#open-modal"
        title="Edit shift times"
        style={style}
        className={shiftType + ' role-' + role.id}
        onClick={() => this.handleClick(shift.id)}
      >
        {shift.start_time.tz(timezone).format(startFormat)}
        -
        {shift.end_time.tz(timezone).format(endFormat)}
      </a>
    );
  }
}

class EmployeeEditShift extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      shiftIndex: 0
    };

    this.changeStartTime = this.changeStartTime.bind(this);
    this.changeEndTime = this.changeEndTime.bind(this);
  }

  componentDidMount() {
    ff.init(this); // Register with FriendlyFire to have subscribers registered
  }

  // Update time on input change
  changeStartTime(e) {
    const time = moment(e.target.value, 'hh:mm');
    let newShift = Object.assign({}, this.props.shifts[this.state.shiftIndex]);
    newShift.start_time.set({ h: time.get('hour'), m: time.get('minute') });

    this.handleChange(newShift);
  }

  changeEndTime(e) {
    const time = moment(e.target.value, 'hh:mm');
    let newShift = Object.assign({}, this.props.shifts[this.state.shiftIndex]);
    /*
    if (
      time.get('hour') < newShift.start_time.get('hour') &&
      newShift.start_time.get('date') == newShift.end_time.get('date')
    ) {
      newShift.end_time.add('day', 1);
    } else {
      newShift.end_time.set('date', newShift.start_time.get('date'))
    }
    */
    newShift.end_time.set({ h: time.get('hour'), m: time.get('minute') });
    this.handleChange(newShift);
  }

  // Change the prop to trigger parent update
  handleChange(newShift) {
    let newShifts = this.props.shifts.slice(0);
    this.props.updateShift(newShifts);
  }

  // Trigger from EmployeeShift by Friendly fire
  onEmployeeShiftClick(id) {
    const shiftIndex = this.props.shifts.findIndex(x => x.id === id);
    this.setState({ shiftIndex: shiftIndex });
  }

  render() {
    // Display loading until data is populated
    if (!this.state.shiftIndex) {
      return <div>Missing ID</div>;
    }

    const { shifts, timezone } = this.props;

    const shift = shifts[this.state.shiftIndex];

    // Set the timezone from parent
    const startTime = shift.start_time.tz(timezone);
    const endTime = shift.end_time.tz(timezone);

    return (
      <div className="roster-edit">
        <h3>Edit shift #{shift.id}</h3>
        <div>
          <label htmlFor="start_time">
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
          <label htmlFor="end_time">
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
const EmployeeTimetable = props => {
  const { employee, shifts, roles, timezone } = props;

  const dayBlock = employee.days.map((day, index) => (
    <div key={day.date.tz(timezone)}>
      <h3>{day.date.tz(timezone).format('ddd')}</h3>
      <ol>
        <React.Fragment>
          <EmployeeTimetableDay
            todayShifts={day.shifts}
            shifts={shifts}
            roles={roles}
            timezone={timezone}
          />
        </React.Fragment>
      </ol>
    </div>
  ));

  return (
    <div className="timetable">
      <h2>
        Daily roster for{' '}
        <strong>{employee.first_name + ' ' + employee.last_name}</strong>
      </h2>
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
};

const EmployeeTimetableDay = props => {
  const { todayShifts, shifts, roles, timezone } = props;

  const timeBlock = todayShifts.map((shiftId, i) => {
    const shift = shifts.filter(shift => {
      return shift.id === shiftId;
    })[0];

    // Get the role for styles and class name
    const role = roles.filter(role => {
      return role.id === shift.role_id;
    })[0];

    // Bug: these aren't being offset correctly. Change to duration in minutes to capture half hours
    const startTime = shift.start_time.tz(timezone);
    const endTime = shift.end_time.tz(timezone);
    let timeFormat = 'h:mma';

    const offset = startTime.format('H');
    let duration = endTime.format('H') - startTime.format('H');

    //const offset = moment.duration((startTime.startOf('day')).diff(startTime)).asMinutes();
    //const nextDay = (endTime.format('H') - startTime.format('H') > 0) ? true : false;
    //let duration = moment.duration(endTime.diff(startTime)).asMinutes();

    // Ends next day to extend to midnight
    if (duration < 0) {
      duration = 25 - offset;
      timeFormat = 'h:mma (ddd)';
    }

    const style = {
      backgroundColor: role.background_colour,
      color: role.text_colour,
      marginTop: offset * 3 + 'em',
      height: duration * 3 + 'em'
    };

    return (
      <React.Fragment key={shift.id}>
        <li style={style}>
          <div>
            {startTime.format(timeFormat)}
            -
            {endTime.format(timeFormat)}
          </div>
        </li>
      </React.Fragment>
    );
  });

  return <React.Fragment>{timeBlock}</React.Fragment>;
};

export default App;
