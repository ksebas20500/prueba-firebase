from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import List, Set, Dict, Any

app = Flask(__name__)
CORS(app)

class FiniteAutomaton:
    """
    Clase que representa un Autómata Finito (DFA o NFA).
    Implementa la quíntupla M = (Q, Σ, δ, q0, F).
    """
    def __init__(self, states: List[str], alphabet: List[str], transitions: List[Dict[str, Any]], initial_state: str, final_states: List[str]):
        self.Q = set(states)
        self.Sigma = set(alphabet)
        self.delta = transitions
        self.q0 = initial_state
        self.F = set(final_states)
        
    def get_epsilon_closure(self, states: Set[str]) -> Set[str]:
        """
        Calcula la clausura-ε para un conjunto de estados.
        """
        closure = set(states)
        stack = list(states)
        
        while stack:
            u = stack.pop()
            for t in self.delta:
                if t['from'] == u and t['symbol'] == '': # Representamos ε como cadena vacía
                    v = t['to']
                    if v not in closure:
                        closure.add(v)
                        stack.append(v)
        return closure

    def step(self, current_states: Set[str], symbol: str) -> Set[str]:
        """
        Realiza la transición de un conjunto de estados a través de un símbolo.
        """
        next_states = set()
        for state in current_states:
            for t in self.delta:
                if t['from'] == state and t['symbol'] == symbol:
                    next_states.add(t['to'])
        
        return self.get_epsilon_closure(next_states)

    def simulate(self, input_string: str) -> List[Dict[str, Any]]:
        """
        Simula el procesamiento de una cadena paso a paso.
        Retorna el historial de estados activos en cada paso.
        """
        # Estado inicial con su clausura épsilon
        current_active = self.get_epsilon_closure({self.q0})
        history = [{"active_states": list(current_active), "symbol": None, "accepted": any(s in self.F for s in current_active)}]
        
        for char in input_string:
            if char not in self.Sigma:
                # Símbolo no pertenece al alfabeto
                return history + [{"error": f"Símbolo '{char}' no pertenece al alfabeto"}]
            
            current_active = self.step(current_active, char)
            history.append({
                "active_states": list(current_active),
                "symbol": char,
                "accepted": any(s in self.F for s in current_active)
            })
            
        return history

@app.route('/simulate', methods=['POST'])
def simulate_automaton():
    data = request.json
    try:
        fa = FiniteAutomaton(
            states=data['states'],
            alphabet=data['alphabet'],
            transitions=data['transitions'],
            initial_state=data['initial_state'],
            final_states=data['final_states']
        )
        input_string = data.get('input_string', '')
        history = fa.simulate(input_string)
        
        is_accepted = history[-1].get('accepted', False) if "error" not in history[-1] else False
        
        return jsonify({
            "status": "success",
            "history": history,
            "accepted": is_accepted
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5005)
