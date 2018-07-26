import moment from 'moment';

// Convert start and end time into moment dates
export function convertDatesToTimestamp(shifts) {
	const newShifts = shifts.map(shift =>
		Object.assign({}, shift, { 
			start_time: moment(shift.start_time),
			end_time: moment(shift.end_time)
		})
	);

	return newShifts;
}

// Order by start_time (earliest first)
export function compareDates(a, b) {
	return a.start_time - b.start_time;
}

// Count the number of shifts for each employee
export function countShifts(days) {
  let count = 0;
  for (let i = 0; i < days.length; i++) {
    count += days[i].shifts.length
  }
  return count; 
}

// Return the number of hours worked for each employee
// TODO: refactor and pass just the employee ID to get their shifts
export function countHours(days, shifts) {
  let hours = 0.0;
  for (let i = 0; i < days.length; i++) {
    for (let j = 0; j < days[i].shifts.length; j++) {
    	const shiftId = days[i].shifts[j];
    	const shift = shifts.filter(shift => {
        return shift.id === shiftId;
      })[0];

    	hours += parseFloat(moment.duration(shift.end_time.diff(shift.start_time)).asHours());
    }
  }

  return hours.toFixed(1) + ' hrs'; 
}