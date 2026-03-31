import React from 'react';
import styled from 'styled-components';

const Button = () => {
  return (
    <StyledWrapper>
      <div className="button-container">
        <div className="button">
          <span>Get Started</span>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Container to enable 3D perspective */
  .button-container {
    perspective: 1000px;
  }

  /* Base button styles with capsule shape and glass effect */
  .button {
    width: 200px;
    height: 60px;
    border-radius: 30px; /* Creates the capsule shape */
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0.05)
    ); /* Transparent glass gradient */
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      /* Top highlight */ inset 0 -1px 2px rgba(0, 0, 0, 0.2),
      /* Bottom shadow */ 0 4px 8px rgba(0, 0, 0, 0.2),
      /* Drop shadow */ 0 0 20px rgba(255, 255, 255, 0.1); /* Subtle glow */
    transform: rotateX(15deg) translateZ(0); /* Initial 3D tilt */
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55); /* Springy transition */
    position: relative;
    cursor: pointer;
    animation: pulse 2s infinite ease-in-out; /* Pulsing glow animation */
    overflow: hidden;
  }

  /* Moving shine effect for glass-like reflection */
  .button::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50px;
    width: 50px;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.1),
      transparent
    ); /* Shine gradient */
    transform: skewX(-25deg); /* Tilted shine */
    animation: shine 3s infinite linear; /* Continuous shine movement */
    pointer-events: none;
    z-index: 1;
  }

  /* Ground shadow to enhance 3D effect */
  .button::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 10%;
    width: 80%;
    height: 10px;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0.3) 0%,
      transparent 70%
    ); /* Soft shadow */
    z-index: -1;
  }

  /* Text inside the button */
  .button span {
    position: relative;
    z-index: 2;
    color: white;
    font-size: 18px;
    font-family: Arial, sans-serif;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); /* Depth for text */
    display: block;
    line-height: 60px; /* Center vertically */
    text-align: center;
  }

  /* Hover state: Straighten, lift, and enhance glow */
  .button:hover {
    transform: rotateX(0deg) translateZ(15px) scale(1.05); /* Lift and scale */
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 2px rgba(0, 0, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.3),
      /* Stronger shadow */ 0 0 40px rgba(255, 255, 255, 0.25); /* Brighter glow */
  }

  /* Active state: Depress and dim glow */
  .button:active {
    transform: rotateX(0deg) translateZ(-5px) scale(0.95); /* Push down */
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 2px rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.2),
      /* Reduced shadow */ 0 0 10px rgba(255, 255, 255, 0.1); /* Dimmed glow */
  }

  /* Pulsing animation for idle state */
  @keyframes pulse {
    0%,
    100% {
      box-shadow:
        inset 0 1px 2px rgba(255, 255, 255, 0.4),
        inset 0 -1px 2px rgba(0, 0, 0, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.2),
        0 0 20px rgba(255, 255, 255, 0.1);
    }
    50% {
      box-shadow:
        inset 0 1px 2px rgba(255, 255, 255, 0.4),
        inset 0 -1px 2px rgba(0, 0, 0, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.2),
        0 0 30px rgba(255, 255, 255, 0.2); /* Peak glow */
    }
  }

  /* Shine animation for dynamic glass effect */
  @keyframes shine {
    0% {
      left: -50px; /* Start off-screen */
    }
    100% {
      left: 250px; /* Move past button width (200px + buffer) */
    }
  }`;

export default Button;
