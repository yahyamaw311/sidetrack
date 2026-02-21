import React from 'react';
import Svg, { Path, Circle, SvgProps } from 'react-native-svg';
import { StyleProp, ViewStyle } from 'react-native';

interface LogoProps extends SvgProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const Logo = ({ size = 24, color = '#FFFFFF', style, ...props }: LogoProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      {/* 
        The "Sidetrack" Concept:
        1. The "Plan": A vertical track (dashed, faded) representing the content you *thought* you'd watch.
        2. The "Detour": A bold, smooth curve pulling you away into something new.
        3. The "Discovery": A solid dot at the end of the new path.
      */}

      {/* The Main Track (Faded / Planned) */}
      <Path
        d="M7 3V21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.25"
        strokeDasharray="0.1 5" 
      />

      {/* The Sidetrack (Bold / Discovery) */}
      <Path
        d="M7 9C7 9 14 9 17 14C19 17.33 19 17.33 19 17.33"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The Destination Point */}
      <Circle cx="19" cy="17.33" r="2.5" fill={color} />
      
      {/* The Junction Point */}
      <Circle cx="7" cy="9" r="1.5" fill={color} />
    </Svg>
  );
};
