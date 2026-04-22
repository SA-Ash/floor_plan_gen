import { useSelector, useDispatch } from 'react-redux';
import { loginStart, loginSuccess, loginFailure, logout } from '../../store/slices/authSlice';

export default function useAuth() {
    const dispatch = useDispatch();
    const auth = useSelector(state => state.auth);

    const login = async (credentials) => {
        dispatch(loginStart());
        try {
            // Simulated login
            const user = { id: 1, name: 'Demo User', email: credentials.email };
            dispatch(loginSuccess({ user, token: 'demo-token' }));
            localStorage.setItem('bmh_token', 'demo-token');
            return user;
        } catch (err) {
            dispatch(loginFailure(err.message));
            throw err;
        }
    };

    const logoutUser = () => {
        dispatch(logout());
        localStorage.removeItem('bmh_token');
    };

    return { ...auth, login, logout: logoutUser };
}
