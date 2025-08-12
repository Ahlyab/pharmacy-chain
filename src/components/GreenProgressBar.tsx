import React, { useEffect, useState } from 'react';
import Spinner from './Spinner';
import './Spinner.css';

interface GreenProgressBarProps {
	loading: boolean;
	children: React.ReactNode;
}

// Usage: <GreenProgressBar loading={loading}>{content}</GreenProgressBar>
const GreenProgressBar: React.FC<GreenProgressBarProps> = ({ loading, children }) => {
	const [showSpinner, setShowSpinner] = useState(false);
	const [lastLoading, setLastLoading] = useState(false);

	useEffect(() => {
		if (loading) {
			setShowSpinner(true);
			setLastLoading(true);
		} else if (lastLoading) {
			// Keep spinner for at least 0.5s after loading ends
			const timer = setTimeout(() => {
				setShowSpinner(false);
				setLastLoading(false);
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [loading, lastLoading]);

	return (
		<div style={{ position: 'relative', minHeight: '40px' }}>
			{showSpinner ? (
				<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px' }}>
					<Spinner />
				</div>
			) : (
				children
			)}
		</div>
	);
};

export default GreenProgressBar;
