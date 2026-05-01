import { useSelector, useDispatch } from 'react-redux';
import { setCurrentProject, setLoading, setError } from '../../store/slices/projectSlice';

export default function useProject() {
    const dispatch = useDispatch();
    const { projects, currentProject, loading, error, filters } = useSelector(state => state.project);

    const loadProject = async (id) => {
        dispatch(setLoading());
        try {
            // Simulated API call
            dispatch(setCurrentProject({ id, name: 'Demo Project' }));
        } catch (err) {
            dispatch(setError(err.message));
        }
    };

    return { projects, currentProject, loading, error, filters, loadProject };
}
