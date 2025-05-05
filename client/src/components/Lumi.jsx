"use client";

import { useEffect, useRef, useState } from "react";

function Lumi({ color = "#3b82f6", size = 100 }) {
  const videoRef = useRef(null);
  const mainRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  // Add a state to track if Lumi should return to center
  const [isReturning, setIsReturning] = useState(false);
  // Track the last animation frame to cancel it if needed
  const animationFrameRef = useRef(null);
  // Add a timeout ref to track the return delay
  const returnTimeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };

      window.addEventListener("resize", handleResize);

      const eyeElements = document.querySelectorAll(".eye");
      const main = document.querySelector(".anchor");
      if (!main) return;
      
      const middle = main.getBoundingClientRect();
      const anchorX = middle.left + middle.width / 2;
      const anchorY = middle.top + middle.height / 2;
      const maxRadius = windowWidth < 450 ? 50 : 100;

      const calAngleAndDistance = (cx, cy, ex, ey) => {
        const dy = ey - cy;
        const dx = ex - cx;
        const rad = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { angle: rad, distance: distance };
      };

      // Function to smoothly return Lumi to the center
      const returnToCenter = () => {
        if (!videoRef.current) return;
        
        // Get current transform
        const currentTransform = window.getComputedStyle(videoRef.current).transform;
        let currentX = 0;
        let currentY = 0;
        
        // Parse the transform matrix to get current X and Y
        if (currentTransform !== 'none') {
          const matrix = new DOMMatrix(currentTransform);
          currentX = matrix.m41;
          currentY = matrix.m42;
        }
        
        // If Lumi is already centered (or very close), stop the animation
        if (Math.abs(currentX) < 0.5 && Math.abs(currentY) < 0.5) {
          setIsReturning(false);
          return;
        }
        
        // Calculate new position with faster easing (0.7 for even faster return)
        const newX = currentX * 0.7;
        const newY = currentY * 0.7;
        
        // Apply the new transform
        videoRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        
        // Also move the eyes
        eyeElements.forEach((item) => {
          item.style.transform = `translate(${newX*2}px, ${newY*2}px)`;
        });
        
        // Continue animation
        animationFrameRef.current = requestAnimationFrame(returnToCenter);
      };

      // Function to start the return process
      const scheduleReturn = () => {
        // Clear any existing timeout
        if (returnTimeoutRef.current) {
          clearTimeout(returnTimeoutRef.current);
        }
        
        // Set timeout to return after 100ms of inactivity
        returnTimeoutRef.current = setTimeout(() => {
          setIsReturning(true);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          animationFrameRef.current = requestAnimationFrame(returnToCenter);
        }, 1000);
      };

      const handleMouseMove = (e) => {
        // If Lumi is returning to center, stop the return animation
        if (isReturning) {
          setIsReturning(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        }
        
        // Check if the mouse is over a button or a clickable element
        // This prevents Lumi from responding to mouse events when interacting with UI elements
        const target = e.target;
        const isClickable = 
          target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.classList.contains('control-button') || 
          target.parentElement?.classList.contains('control-button') ||
          target.classList.contains('voice-button') ||
          target.parentElement?.classList.contains('voice-button') ||
          target.classList.contains('volume-controls') ||
          target.parentElement?.classList.contains('volume-controls') ||
          target.classList.contains('cursor-pointer') ||
          target.closest('.cursor-pointer');
        
        // If mouse is over a clickable element, don't move Lumi
        if (isClickable) {
          return;
        }
        
        const mousex = e.clientX;
        const mousey = e.clientY;

        const { angle, distance } = calAngleAndDistance(
          anchorX,
          anchorY,
          mousex,
          mousey
        );

        const constrainedDistance = Math.min(distance, maxRadius);

        const offsetX = Math.cos(angle) * constrainedDistance;
        const offsetY = Math.sin(angle) * constrainedDistance;

        eyeElements.forEach((item) => {
          item.style.transform = `translate(${offsetX*2}px, ${offsetY*2}px)`;
        });

        if (videoRef.current) {
          videoRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
        
        // Schedule return after this mouse movement
        scheduleReturn();
      };

      document.addEventListener("mousemove", handleMouseMove);

      const blinkInterval = setInterval(() => {
        eyeElements.forEach((eye) => {
          eye.classList.add("blink");
          setTimeout(() => {
            eye.classList.remove("blink");
          }, 300); // Duration of the blink animation
        });
      }, 3000); // Blinking every 3 seconds

      if (mainRef.current) {
        mainRef.current.focus();
      }

      // Start effect to watch isReturning state
      if (isReturning) {
        animationFrameRef.current = requestAnimationFrame(returnToCenter);
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        clearInterval(blinkInterval);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (returnTimeoutRef.current) {
          clearTimeout(returnTimeoutRef.current);
        }
      };
    }
  }, [windowWidth, isReturning]);

  // Create dynamic styles based on props
  const lumiStyle = {
    width: `${size}px`,
    height: `${size}px`
  };

  // Since we can't use an actual video file, let's create a CSS-based lumi
  return (
    <div className="relative mix-blend-screen" ref={mainRef} style={lumiStyle}>
      {/* Lumi background */}
      <div
        ref={videoRef}
        className="anchor transition-transform duration-1000 ease-out absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`,
          width: '100%',
          height: '100%'
        }}
      ></div>

      {/* Eyes */}
      <div 
        className="flex gap-[0.8rem] absolute top-[50%] left-[50%] transform -translate-x-[45%] -translate-y-[35%] z-20"
        style={{ gap: `${size * 0.15}px` }}
      >
        <div 
          className="bg-white rounded-md eye transition-transform duration-1000 ease-out"
          style={{ 
            height: `${size * 0.25}px`, 
            width: `${size * 0.1}px`,
            borderRadius: `${size * 0.05}px`
          }}
        ></div>
        <div 
          className="bg-white rounded-md eye transition-transform duration-1000 ease-out"
          style={{ 
            height: `${size * 0.25}px`, 
            width: `${size * 0.1}px`,
            borderRadius: `${size * 0.05}px`
          }}
        ></div>
      </div>

      <style jsx="true">{`
        .blink {
          height: ${size * 0.05}px !important;
          transition: height 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Lumi;