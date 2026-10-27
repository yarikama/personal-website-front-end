"""Clips for /learnings/learning-from-reward."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class TheLoop(Clip):
    """The agent and its world, trading actions for states and rewards; then
    the loop laid out in time, and the goal: the total of the rewards."""

    def construct(self):
        agent_box = RoundedRectangle(width=3.4, height=2.2, corner_radius=0.15, stroke_color=INK, stroke_width=3)
        world_box = RoundedRectangle(width=3.4, height=2.2, corner_radius=0.15, stroke_color=INK, stroke_width=3)
        agent_box.move_to(LEFT * 4.2 + UP * 0.6)
        world_box.move_to(RIGHT * 4.2 + UP * 0.6)
        agent = words("Agent", font_size=48).move_to(agent_box)
        world = words("Environment", font_size=44).move_to(world_box)
        agent_note = words("you", font_size=34, color=FADED).next_to(agent_box, UP, buff=0.25)
        world_note = words("pan and pancake", font_size=34, color=FADED).next_to(world_box, UP, buff=0.25)

        top_y = agent_box.get_center()[1] + 0.5
        low_y = agent_box.get_center()[1] - 0.5
        act = Arrow(
            np.array([agent_box.get_right()[0], top_y, 0]), np.array([world_box.get_left()[0], top_y, 0]),
            buff=0.15, stroke_color=INK, stroke_width=4,
        )
        back = Arrow(
            np.array([world_box.get_left()[0], low_y, 0]), np.array([agent_box.get_right()[0], low_y, 0]),
            buff=0.15, stroke_color=SAGE, stroke_width=4,
        )
        action = formula(R"\text{action }A_t", font_size=40).next_to(act, UP, buff=0.15)
        seen = VGroup(
            formula(R"\text{state }S_{t+1}", font_size=40),
            formula(R"\text{reward }R_{t+1}", font_size=40, color=SAGE),
        ).arrange(DOWN, buff=0.2).next_to(back, DOWN, buff=0.2)

        self.play(ShowCreation(agent_box), ShowCreation(world_box), FadeIn(agent), FadeIn(world), run_time=1.2)
        self.play(FadeIn(agent_note), FadeIn(world_note))
        self.play(GrowArrow(act), FadeIn(action, shift=0.2 * UP))
        self.play(GrowArrow(back), FadeIn(seen, shift=0.2 * DOWN))
        self.wait(0.4)

        # Round and round: a dot carries the action over, the state and
        # reward back
        token = Dot(radius=0.12, fill_color=SAGE).move_to(act.get_start())
        self.add(token)
        for _ in range(2):
            token.move_to(act.get_start()).set_fill(INK)
            self.play(token.animate.move_to(act.get_end()), Indicate(action, color=INK, scale_factor=1.08), run_time=0.9)
            token.move_to(back.get_start()).set_fill(SAGE)
            self.play(token.animate.move_to(back.get_end()), Indicate(seen, color=SAGE, scale_factor=1.08), run_time=0.9)
        self.remove(token)
        self.wait(0.3)

        # The loop shrinks out of the way, too small now for its notes
        loop = VGroup(agent_box, world_box, agent, world, act, back, action, seen)
        self.play(FadeOut(agent_note), FadeOut(world_note), loop.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=1.2)

        # The loop laid out in time
        names = ["S_0", "A_0", "R_1", "S_1", "A_1", "R_2", "S_2", "A_2", "R_3", R"\cdots"]
        colours = {"S": INK, "A": FADED, "R": SAGE, "\\": FADED}
        timeline = VGroup(*(formula(name, font_size=56, color=colours[name[0]]) for name in names))
        timeline.arrange(RIGHT, buff=0.55).move_to(DOWN * 0.4)
        time_arrow = Arrow(timeline.get_left() + LEFT * 0.2, timeline.get_right() + RIGHT * 0.3, buff=0, stroke_color=RULE, stroke_width=3)
        time_arrow.next_to(timeline, DOWN, buff=0.3)
        time = words("time", font_size=34, color=FADED).next_to(time_arrow, DOWN, buff=0.1).align_to(time_arrow, RIGHT)
        self.play(LaggedStart(*(FadeIn(item, shift=0.3 * RIGHT) for item in timeline), lag_ratio=0.18), run_time=2.4)
        self.play(GrowArrow(time_arrow), FadeIn(time))
        self.wait(0.6)

        # The goal: all the rewards added up, not only the next one
        goal, pieces = split_formula(R"\text{maximize}\quad", "R_1", "+", "R_2", "+", "R_3", "+", R"\cdots", font_size=60)
        goal.to_edge(DOWN, buff=0.75)
        pieces[1:].set_fill(SAGE)
        pieces[0].set_fill(INK)
        rewards = [timeline[2], timeline[5], timeline[8]]
        self.play(
            FadeIn(pieces[0]),
            *(TransformFromCopy(reward, pieces[i]) for reward, i in zip(rewards, (1, 3, 5))),
            run_time=1.6,
        )
        self.play(FadeIn(pieces[2]), FadeIn(pieces[4]), FadeIn(pieces[6:]))
        brace = Brace(pieces[1:], UP, buff=0.12).set_fill(SAGE)
        total = words("the total, not just the next one", font_size=36, color=SAGE).next_to(brace, UP, buff=0.12)
        self.play(FadeOut(time), FadeOut(time_arrow), GrowFromCenter(brace), FadeIn(total, shift=0.2 * UP))
        self.wait(3)
