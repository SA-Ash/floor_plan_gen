/** Input validation utilities */

export function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} is required`;
    }
    return null;
}

export function validateNumber(value, fieldName, { min, max } = {}) {
    const num = Number(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`;
    if (max !== undefined && num > max) return `${fieldName} must be at most ${max}`;
    return null;
}

export function validatePlotSize(width, length) {
    const errors = {};
    if (!width || width <= 0) errors.plotWidth = 'Plot width is required';
    if (!length || length <= 0) errors.plotLength = 'Plot length is required';
    if (width > 0 && width < 10) errors.plotWidth = 'Minimum width is 10 ft';
    if (length > 0 && length < 10) errors.plotLength = 'Minimum length is 10 ft';
    return Object.keys(errors).length > 0 ? errors : null;
}

export function validateProjectForm(form) {
    const errors = {};
    const nameErr = validateRequired(form.name, 'Project name');
    if (nameErr) errors.name = nameErr;

    const plotErr = validatePlotSize(Number(form.plotWidth), Number(form.plotLength));
    if (plotErr) Object.assign(errors, plotErr);

    const floorsErr = validateNumber(form.floors, 'Floors', { min: 1, max: 100 });
    if (floorsErr) errors.floors = floorsErr;

    if (!form.buildingType) errors.buildingType = 'Select a building type';

    const totalRooms = Object.values(form.rooms || {}).reduce((s, v) => s + v, 0);
    if (totalRooms === 0) errors.rooms = 'Add at least one room';

    return Object.keys(errors).length > 0 ? errors : null;
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) ? null : 'Invalid email address';
}
