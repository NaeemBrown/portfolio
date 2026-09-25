/* ======================================================================
   Four entrance previews rendered by the actual portfolio world.

   This file deliberately does not create a substitute scene. It supplies
   an optional pose/offset hook to script.js's real frame loop, appends a
   few props to the real SVG rig, and uses the existing wind/daylight
   systems. Outside preview mode it is inert.
   ====================================================================== */

(() => {
  const params = new URLSearchParams(location.search);
  const variants = {
    clear: { duration: 5.2, hour: 12 },
    rain: { duration: 5.8, hour: 15.5 },
    wind: { duration: 5.6, hour: 12 },
    snow: { duration: 5.9, hour: 7.5 },
  };
  const entrance = {
    active: false,
    weather: 'clear',
    time: 0,
    duration: variants.clear.duration,
    startShift: 0,
    travelled: 0,
    gusted: false,
    beat: -1,
    complete: false,
  };

  const layer = document.createElement('div');
  layer.className = 'entrance-weather-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="entrance-rain"></div><div class="entrance-snow"></div>'
    + '<span class="entrance-puddle"></span><span class="entrance-snow-floor"></span>';
  scene.append(layer);

  const rain = layer.querySelector('.entrance-rain');
  const snow = layer.querySelector('.entrance-snow');
  for (let i = 0; i < 42; i += 1) {
    const drop = document.createElement('i');
    drop.style.setProperty('--x', `${(i * 23.7) % 104}%`);
    drop.style.setProperty('--d', `${0.72 + (i % 7) * 0.09}s`);
    drop.style.setProperty('--delay', `${-(i % 13) * 0.12}s`);
    rain.append(drop);
  }
  for (let i = 0; i < 34; i += 1) {
    const flake = document.createElement('i');
    flake.style.setProperty('--x', `${(i * 31.3) % 102}%`);
    flake.style.setProperty('--s', `${2 + (i % 4)}px`);
    flake.style.setProperty('--d', `${4.1 + (i % 8) * 0.46}s`);
    flake.style.setProperty('--delay', `${-(i % 11) * 0.42}s`);
    snow.append(flake);
  }

  const rigRoot = figure.querySelector('.rig');
  const props = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  props.setAttribute('class', 'entrance-props');
  props.setAttribute('aria-hidden', 'true');
  props.innerHTML = `
    <g class="entrance-prop entrance-prop--umbrella">
      <path class="entrance-prop__fill" d="M39 57Q73 6 119 31Q137 41 145 57Q129 48 111 58Q92 47 73 58Q55 48 39 57Z" />
      <path d="M92 51V139q0 14 12 14 10 0 10-10" />
    </g>
    <g class="entrance-prop entrance-prop--hat">
      <g class="entrance-hat-shape">
        <path class="entrance-prop__fill" d="M49 20h43M58 19Q61-2 80 2q14 3 15 17Z" />
        <path d="M64 8q13 5 25 0" />
      </g>
    </g>
    <g class="entrance-prop entrance-prop--skis">
      <path d="M28 240h84q15 0 18-9M18 249h83q15 0 19-9" />
    </g>
    <g class="entrance-prop entrance-prop--powder">
      <circle cx="22" cy="231" r="5" /><circle cx="11" cy="221" r="3" />
      <circle cx="-1" cy="234" r="6" /><circle cx="-13" cy="218" r="3.5" />
    </g>`;
  // Props ride with the complete rig rather than the leaning torso. This keeps
  // translated props (especially the wind-blown hat) in character space.
  rigRoot.append(props);

  const umbrella = props.querySelector('.entrance-prop--umbrella');
  const hat = props.querySelector('.entrance-prop--hat');
  const hatShape = props.querySelector('.entrance-hat-shape');
  const skis = props.querySelector('.entrance-prop--skis');
  const powder = props.querySelector('.entrance-prop--powder');

  const clip = (value) => clamp(value, 0, 1);
  const show = (el, amount) => el.style.opacity = clamp(amount, 0, 1).toFixed(3);
  const wave = (p, amount, time) => {
    const k = ease(clip(amount));
    p.near.shoulder = mix(p.near.shoulder, -138 + 7 * Math.sin(time * 17), k);
    p.near.elbow = mix(p.near.elbow, -22 + 30 * Math.sin(time * 17), k);
  };
  // Drive the limbs from elapsed time, not the large preview screen offset.
  // Distance-based phase could skip several gait poses in one frame while
  // the figure entered from off-screen, which made the limbs appear to snap.
  const movingPose = (base, elapsed, strength = 1, gait = GAITS.walk, cycle = WALK_CYCLE) => {
    const p = pose(gait, (Math.max(0, elapsed) / cycle) * 100);
    return mixPose(base, p, clip(strength));
  };
  const blendArm = (side, target, amount) => {
    const k = ease(clip(amount));
    side.shoulder = mix(side.shoulder, target.shoulder, k);
    side.elbow = mix(side.elbow, target.elbow, k);
  };
  const resetProps = () => {
    show(umbrella, 0);
    show(hat, 0);
    show(skis, 0);
    show(powder, 0);
    hat.removeAttribute('transform');
    hatShape.removeAttribute('transform');
  };

  const clearFrame = (base, progress, now) => {
    const enter = easeOut(clip(progress / 0.82));
    const shift = mix(entrance.startShift, 0, enter);
    const strength = ease(clip(progress / 0.1)) * ease(clip((1 - progress) / 0.15));
    const p = movingPose(base, entrance.time, strength);
    const hello = ease(clip((progress - 0.34) / 0.1)) * ease(clip((0.82 - progress) / 0.15));
    wave(p, hello, now / 1000);
    return { pose: p, shift, lift: 0, flip: 1, gait: progress < 0.88 ? 'walking' : 'idle' };
  };

  const rainFrame = (base, progress) => {
    const enter = easeOut(clip(progress / 0.84));
    const shift = mix(entrance.startShift, 0, enter);
    const strength = ease(clip(progress / 0.1)) * ease(clip((1 - progress) / 0.15));
    const propAmount = ease(clip(progress / 0.1)) * ease(clip((1 - progress) / 0.12));
    const p = movingPose(base, entrance.time, strength);
    const hop = Math.sin(Math.PI * clamp((progress - 0.42) / 0.22, 0, 1));
    p.lean = mix(p.lean, -4, propAmount * clip(0.4 + hop * 0.38));
    blendArm(p.near, armReach(p.lean, 92, 118), propAmount);
    show(umbrella, propAmount);
    if (progress > 0.87) {
      const shake = Math.sin((progress - 0.87) * 110) * (1 - (progress - 0.87) / 0.13);
      p.spin = shake * 2.4;
    }
    return { pose: p, shift, lift: hop * 54 * view.unit, flip: 1, gait: hop > 0.05 ? 'flipping' : progress < 0.88 ? 'walking' : 'idle' };
  };

  const windFrame = (base, progress) => {
    const enter = easeOut(clip(progress / 0.86));
    const buffeted = -34 * view.unit * Math.sin(Math.PI * clip(progress / 0.26));
    const shift = mix(entrance.startShift, 0, enter) + buffeted;
    const strength = ease(clip(progress / 0.09)) * ease(clip((1 - progress) / 0.16));
    const windAmount = ease(clip(progress / 0.12)) * ease(clip((1 - progress) / 0.16));
    const p = movingPose(base, entrance.time, strength, GAITS.run, RUN_CYCLE);
    const settle = ease(clip((progress - 0.8) / 0.2));
    const windLean = mix(12 + 4 * Math.sin(progress * 46), 0, settle);
    p.lean = mix(p.lean, windLean, windAmount);
    const chasing = ease(clip((progress - 0.18) / 0.16)) * ease(clip((0.84 - progress) / 0.16));
    blendArm(p.near, armReach(p.lean, mix(96, 130, chasing), mix(100, 62, chasing)),
      windAmount * mix(0.45, 1, chasing));
    const out = easeOut(clip((progress - 0.15) / 0.45));
    const home = ease(clip((progress - 0.68) / 0.2));
    const dx = mix(mix(0, 116, out), 0, home);
    const dy = mix(-44 * Math.sin(Math.PI * out), 0, home);
    show(hat, ease(clip((progress - 0.1) / 0.08)) * ease(clip((0.93 - progress) / 0.09)));
    hat.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    return { pose: p, shift, lift: 0, flip: 1, gait: progress < 0.88 ? 'running' : 'idle' };
  };

  const snowFrame = (base, progress) => {
    const enter = 1 - (1 - clip(progress / 0.8)) ** 4;
    const shift = mix(entrance.startShift, 0, enter);
    const snowAmount = ease(clip(progress / 0.12)) * ease(clip((1 - progress) / 0.14));
    const skiPose = clonePose(base);
    const stop = Math.sin(Math.PI * clip((progress - 0.56) / 0.27));
    skiPose.bob = 8 + 5 * stop;
    skiPose.lean = mix(8, -11, stop);
    Object.assign(skiPose.near, { thigh: -14, knee: 22, ankle: -8 });
    Object.assign(skiPose.far, { thigh: 12, knee: -14, ankle: 5 });
    const p = mixPose(base, skiPose, snowAmount);
    const brush = ease(clip((progress - 0.78) / 0.08)) * ease(clip((0.98 - progress) / 0.12));
    p.near.shoulder = mix(p.near.shoulder, -112 + 9 * Math.sin(progress * 70), brush);
    p.near.elbow = mix(p.near.elbow, -48, brush);
    p.far.shoulder = mix(p.far.shoulder, 78, brush);
    show(skis, ease(clip(progress / 0.1)) * ease(clip((1 - progress) / 0.12)));
    show(powder, Math.sin(Math.PI * clamp((progress - 0.55) / 0.25, 0, 1)));
    return { pose: p, shift, lift: 0, flip: 1, gait: progress < 0.82 ? 'flipping' : 'idle' };
  };

  const renderers = { clear: clearFrame, rain: rainFrame, wind: windFrame, snow: snowFrame };

  function stopEntrance({ keepWeather = false } = {}) {
    entrance.active = false;
    resetProps();
    bag.setAttribute('hidden', '');
    if (!keepWeather) {
      scene.removeAttribute('data-entrance-weather');
      layer.removeAttribute('data-weather');
    }
  }

  function startEntrance(weather = 'clear') {
    if (!variants[weather]) return false;
    finishIntro(false);
    greeting.active = false;
    cancelAmbient();
    // A preview is a hard scene reset. Do not let an interrupted welcome or
    // idle animation ease through the first entrance frames underneath it.
    ambient.act = null;
    ambient.out = null;
    ambient.last = null;
    ambient.pinned = 0;
    ambient.face = 0;
    pointerPlay.reaction = null;
    delete scene.dataset.cursorReaction;
    closePanel(false);
    hushSpeech();
    hideCampfireProps();
    hideForgeProps();
    state.wantSeat = state.wantBench = state.wantForge = state.experienceActive = false;
    state.seat = state.compose = state.inspect = state.projectView = state.typeIn = state.termView = 0;
    state.courseTime = 0;
    state.hop = state.jump = null;
    state.speed = 0;
    state.moving = state.sprinting = false;
    state.turning = 0;
    state.destinationId = 'start';
    state.announced = true;
    state.strollUntil = 0;
    state.facing = state.flip = 1;
    state.introShift = 0;
    handcar.stage = 'off';
    figure.style.visibility = '';
    scene.removeAttribute('aria-busy');

    const unit = parseFloat(getComputedStyle(figure).height) / UNITS_TALL;
    view.unit = unit;
    state.x = state.target = nameStart(unit) - 230 * unit;
    idle.next = Infinity;
    incident.cooldownUntil = Infinity;
    startBag.setAttribute('hidden', '');
    bag.removeAttribute('hidden');

    entrance.weather = weather;
    entrance.time = livingReduced.matches ? variants[weather].duration : 0;
    entrance.duration = variants[weather].duration;
    entrance.startShift = -(sceneWidth / 2 + 120);
    entrance.travelled = 0;
    entrance.gusted = false;
    entrance.beat = -1;
    entrance.complete = false;
    entrance.active = true;
    resetProps();
    scene.dataset.entranceWeather = weather;
    layer.dataset.weather = weather;
    pickHour(variants[weather].hour, { quick: true });

    if (weather === 'wind' && !livingReduced.matches) {
      startGust(1);
      cancelAmbient();
      entrance.gusted = true;
    }
    window.parent?.postMessage({ type: 'site-entrance-start', weather }, location.origin === 'null' ? '*' : location.origin);
    return true;
  }

  window.siteEntranceFrame = (dt, now, base) => {
    if (!entrance.active) return null;
    if (!livingReduced.matches) entrance.time = Math.min(entrance.duration, entrance.time + dt);
    const progress = clip(entrance.time / entrance.duration);
    resetProps();
    const frame = renderers[entrance.weather](base, progress, now);
    placeBag(frame.pose, { seat: 0, swing: 4 * Math.sin(progress * 18 * Math.PI), flap: 0, off: 0 });
    bag.removeAttribute('hidden');

    const beat = Math.min(3, Math.floor(progress * 4));
    if (beat !== entrance.beat) {
      entrance.beat = beat;
      window.parent?.postMessage({ type: 'site-entrance-beat', weather: entrance.weather, beat }, location.origin === 'null' ? '*' : location.origin);
      if (beat === 2 && entrance.weather === 'rain') sfx.land();
      if (beat === 2 && entrance.weather === 'snow') sfx.rustle(0.7);
    }
    if (progress >= 1 && !entrance.complete) {
      entrance.complete = true;
      window.parent?.postMessage({ type: 'site-entrance-complete', weather: entrance.weather }, location.origin === 'null' ? '*' : location.origin);
    }
    return frame;
  };

  window.alive.entrances = variants;
  window.alive.previewEntrance = startEntrance;
  window.alive.stopEntrancePreview = stopEntrance;
  window.alive.entranceState = entrance;

  const requested = params.get('entrancePreview');
  if (variants[requested]) requestAnimationFrame(() => startEntrance(requested));

  scene.addEventListener('pointerdown', () => {
    if (entrance.active) stopEntrance();
  }, { capture: true });
  window.addEventListener('keydown', () => {
    if (entrance.active) stopEntrance();
  }, { capture: true });
})();
