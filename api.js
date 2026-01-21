// OpenRouter API Integration for Edgenuity AI Solver
// BYOToken (Bring Your Own Token) - Users provide their own OpenRouter API key

class OpenRouterAPI {
    constructor(apiKey, humanizerApiKey = null) {
        this.apiKey = apiKey;
        this.humanizerApiKey = humanizerApiKey;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.humanizerUrl = 'https://api-service.humanizeai.com/api/v1/humanize/analyze-with-api-key';
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    setHumanizerApiKey(apiKey) {
        this.humanizerApiKey = apiKey;
    }

    setInteractionHandler(handler) {
        this.interactionHandler = handler;
    }

    // Browser interaction tools
    static BROWSER_TOOLS = [
        {
            type: 'function',
            function: {
                name: 'click_element',
                description: 'Click an element on the page (button, link, radio button, checkbox, etc).',
                parameters: {
                    type: 'object',
                    properties: {
                        selectorOrText: {
                            type: 'string',
                            description: 'The ID, CSS selector, or visible text of the element to click.'
                        }
                    },
                    required: ['selectorOrText']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'select_option',
                description: 'Select an option from a dropdown menu.',
                parameters: {
                    type: 'object',
                    properties: {
                        selector: {
                            type: 'string',
                            description: 'The ID or selector of the dropdown menu.'
                        },
                        value: {
                            type: 'string',
                            description: 'The value or text of the option to select.'
                        }
                    },
                    required: ['selector', 'value']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'type_text',
                description: 'Type text into an input field or textarea.',
                parameters: {
                    type: 'object',
                    properties: {
                        selector: {
                            type: 'string',
                            description: 'The ID or selector of the input field.'
                        },
                        text: {
                            type: 'string',
                            description: 'The text to type.'
                        }
                    },
                    required: ['selector', 'text']
                }
            }
        }
    ];

    // Math tools for tool calling
    static MATH_TOOLS = [
        {
            type: 'function',
            function: {
                name: 'calculator',
                description: 'Perform mathematical calculations. Use this for arithmetic, algebra, and numeric computations.',
                parameters: {
                    type: 'object',
                    properties: {
                        expression: {
                            type: 'string',
                            description: 'The mathematical expression to evaluate, e.g., "2 + 2", "sqrt(16)", "15 * 24", "462 / 12 * 60"'
                        }
                    },
                    required: ['expression']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'unit_converter',
                description: 'Convert between different units of measurement.',
                parameters: {
                    type: 'object',
                    properties: {
                        value: {
                            type: 'number',
                            description: 'The numeric value to convert'
                        },
                        from_unit: {
                            type: 'string',
                            description: 'The unit to convert from (e.g., "cubic_inches", "feet", "meters", "gallons", "liters")'
                        },
                        to_unit: {
                            type: 'string',
                            description: 'The unit to convert to'
                        }
                    },
                    required: ['value', 'from_unit', 'to_unit']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'solve_equation',
                description: 'Solve algebraic equations for a variable.',
                parameters: {
                    type: 'object',
                    properties: {
                        equation: {
                            type: 'string',
                            description: 'The equation to solve, e.g., "2x + 5 = 15" or "x^2 - 4 = 0"'
                        },
                        variable: {
                            type: 'string',
                            description: 'The variable to solve for (default: x)',
                            default: 'x'
                        }
                    },
                    required: ['equation']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'calculate_percentage',
                description: 'Calculate percentage or find a value given a percentage. Examples: What is 20% of 150? 30 is what percent of 120? What is 60 after a 15% increase?',
                parameters: {
                    type: 'object',
                    properties: {
                        operation: {
                            type: 'string',
                            enum: ['percent_of', 'what_percent', 'percent_change', 'add_percent', 'subtract_percent'],
                            description: 'The type of percentage calculation'
                        },
                        value1: {
                            type: 'number',
                            description: 'First value (base number or percentage)'
                        },
                        value2: {
                            type: 'number',
                            description: 'Second value (if needed)'
                        }
                    },
                    required: ['operation', 'value1']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'calculate_grade',
                description: 'Calculate grades, weighted averages, or GPA. Useful for finding what score is needed on a test.',
                parameters: {
                    type: 'object',
                    properties: {
                        scores: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Array of scores/grades'
                        },
                        weights: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Optional array of weights (must match scores length)'
                        },
                        target_average: {
                            type: 'number',
                            description: 'Target average to calculate needed score'
                        },
                        upcoming_weight: {
                            type: 'number',
                            description: 'Weight of the upcoming score to find'
                        }
                    },
                    required: ['scores']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'statistics',
                description: 'Calculate statistical measures: mean, median, mode, range, standard deviation, variance.',
                parameters: {
                    type: 'object',
                    properties: {
                        numbers: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Array of numbers to analyze'
                        },
                        measure: {
                            type: 'string',
                            enum: ['all', 'mean', 'median', 'mode', 'range', 'std_dev', 'variance', 'sum'],
                            description: 'Which statistical measure to calculate (default: all)'
                        }
                    },
                    required: ['numbers']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'quadratic_solver',
                description: 'Solve quadratic equations in the form ax² + bx + c = 0. Returns both roots.',
                parameters: {
                    type: 'object',
                    properties: {
                        a: { type: 'number', description: 'Coefficient of x²' },
                        b: { type: 'number', description: 'Coefficient of x' },
                        c: { type: 'number', description: 'Constant term' }
                    },
                    required: ['a', 'b', 'c']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'geometry_calculator',
                description: 'Calculate geometric properties: area, perimeter, volume, surface area for common shapes.',
                parameters: {
                    type: 'object',
                    properties: {
                        shape: {
                            type: 'string',
                            enum: ['circle', 'rectangle', 'triangle', 'sphere', 'cylinder', 'cone', 'cube', 'pyramid'],
                            description: 'The geometric shape'
                        },
                        dimensions: {
                            type: 'object',
                            description: 'Shape dimensions (radius, width, height, length, base, slant_height as needed)'
                        },
                        calculate: {
                            type: 'string',
                            enum: ['area', 'perimeter', 'volume', 'surface_area', 'circumference', 'all'],
                            description: 'What to calculate'
                        }
                    },
                    required: ['shape', 'dimensions']
                }
            }
        }
    ];

    // Writing tools
    static WRITING_TOOLS = [
        {
            type: 'function',
            function: {
                name: 'text_statistics',
                description: 'Analyze text for word count, sentence count, reading level, and other metrics.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The text to analyze'
                        }
                    },
                    required: ['text']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'humanize_text',
                description: 'Make AI-generated text sound more natural and human-like. Use this when the response needs to sound less robotic.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The text to humanize'
                        }
                    },
                    required: ['text']
                }
            }
        }
    ];

    // Interactive/Graph analysis tools
    static INTERACTIVE_TOOLS = [
        {
            type: 'function',
            function: {
                name: 'analyze_graph_data',
                description: 'Analyze graph data points to find trends, calculate rates of change, and identify key features like intercepts and maximums.',
                parameters: {
                    type: 'object',
                    properties: {
                        xValues: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Array of x-axis values (e.g., time points)'
                        },
                        yValues: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Array of corresponding y-axis values (e.g., distances)'
                        },
                        operation: {
                            type: 'string',
                            enum: ['trend', 'rate_of_change', 'find_value_at_x', 'find_x_at_value', 'max', 'min', 'summary'],
                            description: 'What analysis to perform'
                        },
                        target: {
                            type: 'number',
                            description: 'Target value for find operations (x value or y value to search for)'
                        }
                    },
                    required: ['xValues', 'yValues']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'compare_values',
                description: 'Compare two or more values and determine relationships (greater than, less than, equal, difference, percent change).',
                parameters: {
                    type: 'object',
                    properties: {
                        values: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Array of values to compare'
                        },
                        labels: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Labels for each value (optional)'
                        }
                    },
                    required: ['values']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'interpret_table',
                description: 'Interpret table data to find patterns, calculate summaries, or answer questions about the data.',
                parameters: {
                    type: 'object',
                    properties: {
                        headers: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Column headers'
                        },
                        rows: {
                            type: 'array',
                            items: {
                                type: 'array',
                                items: { type: 'string' }
                            },
                            description: 'Table rows as arrays of cell values'
                        },
                        question: {
                            type: 'string',
                            description: 'What to find in the table'
                        }
                    },
                    required: ['rows']
                }
            }
        }
    ];

    // Execute tool calls locally
    async executeToolCall(toolName, args) {
        switch (toolName) {
            case 'click_element':
                if (this.interactionHandler) return await this.interactionHandler.clickElement(args.selectorOrText);
                return { error: 'Interaction handler not set' };
            case 'select_option':
                if (this.interactionHandler) return await this.interactionHandler.selectOption(args.selector, args.value);
                return { error: 'Interaction handler not set' };
            case 'type_text':
                if (this.interactionHandler) return await this.interactionHandler.typeText(args.selector, args.text);
                return { error: 'Interaction handler not set' };
            case 'calculator':
                return this.executeCalculator(args.expression);
            case 'unit_converter':
                return this.executeUnitConverter(args.value, args.from_unit, args.to_unit);
            case 'solve_equation':
                return this.executeSolveEquation(args.equation, args.variable || 'x');
            case 'calculate_percentage':
                return this.executePercentage(args.operation, args.value1, args.value2);
            case 'calculate_grade':
                return this.executeGradeCalculator(args.scores, args.weights, args.target_average, args.upcoming_weight);
            case 'statistics':
                return this.executeStatistics(args.numbers, args.measure || 'all');
            case 'quadratic_solver':
                return this.executeQuadratic(args.a, args.b, args.c);
            case 'geometry_calculator':
                return this.executeGeometry(args.shape, args.dimensions, args.calculate || 'all');
            case 'text_statistics':
                return this.executeTextStatistics(args.text);
            case 'humanize_text':
                return await this.executeHumanize(args.text);
            // Interactive tools
            case 'analyze_graph_data':
                return this.executeGraphAnalysis(args.xValues, args.yValues, args.operation, args.target);
            case 'compare_values':
                return this.executeCompareValues(args.values, args.labels);
            case 'interpret_table':
                return this.executeInterpretTable(args.headers, args.rows, args.question);
            default:
                return { error: `Unknown tool: ${toolName}` };
        }
    }

    // Calculator implementation
    executeCalculator(expression) {
        try {
            // Safely evaluate mathematical expressions
            const sanitized = expression
                .replace(/\^/g, '**')  // Convert ^ to **
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/abs\(/g, 'Math.abs(')
                .replace(/sin\(/g, 'Math.sin(')
                .replace(/cos\(/g, 'Math.cos(')
                .replace(/tan\(/g, 'Math.tan(')
                .replace(/log\(/g, 'Math.log10(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/pi/gi, 'Math.PI')
                .replace(/e(?![a-z])/gi, 'Math.E');

            // Only allow safe characters
            if (!/^[\d\s+\-*/().Math,a-zA-Z]+$/.test(sanitized)) {
                return { error: 'Invalid expression' };
            }

            const result = Function('"use strict"; return (' + sanitized + ')')();
            return { result: result, expression: expression };
        } catch (e) {
            return { error: `Calculation error: ${e.message}` };
        }
    }

    // Unit converter implementation
    executeUnitConverter(value, fromUnit, toUnit) {
        // Conversion factors to base units
        const conversions = {
            // Volume (base: cubic meters)
            'cubic_inches': 0.0000163871,
            'cubic_feet': 0.0283168,
            'cubic_meters': 1,
            'liters': 0.001,
            'gallons': 0.00378541,
            'quarts': 0.000946353,
            'cups': 0.000236588,
            'milliliters': 0.000001,

            // Length (base: meters)
            'inches': 0.0254,
            'feet': 0.3048,
            'yards': 0.9144,
            'miles': 1609.34,
            'meters': 1,
            'centimeters': 0.01,
            'kilometers': 1000,

            // Mass (base: kilograms)
            'ounces': 0.0283495,
            'pounds': 0.453592,
            'grams': 0.001,
            'kilograms': 1,

            // Time (base: seconds)
            'seconds': 1,
            'minutes': 60,
            'hours': 3600,
            'days': 86400
        };

        const fromFactor = conversions[fromUnit.toLowerCase()];
        const toFactor = conversions[toUnit.toLowerCase()];

        if (!fromFactor || !toFactor) {
            return { error: `Unknown unit: ${!fromFactor ? fromUnit : toUnit}` };
        }

        const baseValue = value * fromFactor;
        const result = baseValue / toFactor;

        return {
            result: result,
            from: `${value} ${fromUnit}`,
            to: `${result} ${toUnit}`
        };
    }

    // Equation solver implementation
    executeSolveEquation(equation, variable = 'x') {
        try {
            // Simple linear equation solver: ax + b = c
            const parts = equation.split('=');
            if (parts.length !== 2) {
                return { error: 'Equation must contain exactly one = sign' };
            }

            // Move everything to left side
            let left = parts[0].trim();
            let right = parts[1].trim();

            // Simple cases
            if (!left.includes(variable) && !right.includes(variable)) {
                return { error: `Variable ${variable} not found in equation` };
            }

            // Parse simple linear equations like "2x + 5 = 15" or "x/2 = 8"
            const result = this.solveLinear(left, right, variable);

            return {
                equation: equation,
                variable: variable,
                solution: result
            };
        } catch (e) {
            return { error: `Solver error: ${e.message}` };
        }
    }

    solveLinear(left, right, variable) {
        // Very basic linear solver
        try {
            // Try to evaluate right side
            const rightVal = parseFloat(right) || 0;

            // Simple patterns: "ax", "x", "ax + b", "ax - b"
            const match = left.match(new RegExp(`([+-]?\\d*)\\s*${variable}\\s*([+-]\\s*\\d+)?`));

            if (match) {
                let a = parseFloat(match[1]) || 1;
                if (match[1] === '-') a = -1;
                let b = match[2] ? parseFloat(match[2].replace(/\s/g, '')) : 0;

                const solution = (rightVal - b) / a;
                return solution;
            }

            return 'complex - AI will solve';
        } catch {
            return 'complex - AI will solve';
        }
    }

    // Percentage calculator
    executePercentage(operation, value1, value2) {
        try {
            let result;
            switch (operation) {
                case 'percent_of':
                    // What is value1% of value2?
                    result = (value1 / 100) * value2;
                    return { result, description: `${value1}% of ${value2} = ${result}` };
                case 'what_percent':
                    // value1 is what percent of value2?
                    result = (value1 / value2) * 100;
                    return { result, description: `${value1} is ${result}% of ${value2}` };
                case 'percent_change':
                    // Percent change from value1 to value2
                    result = ((value2 - value1) / value1) * 100;
                    return { result, description: `Percent change from ${value1} to ${value2} = ${result}%` };
                case 'add_percent':
                    // Add value2% to value1
                    result = value1 * (1 + value2 / 100);
                    return { result, description: `${value1} + ${value2}% = ${result}` };
                case 'subtract_percent':
                    // Subtract value2% from value1
                    result = value1 * (1 - value2 / 100);
                    return { result, description: `${value1} - ${value2}% = ${result}` };
                default:
                    return { error: 'Unknown percentage operation' };
            }
        } catch (e) {
            return { error: `Percentage error: ${e.message}` };
        }
    }

    // Grade calculator
    executeGradeCalculator(scores, weights, targetAverage, upcomingWeight) {
        try {
            if (!scores || scores.length === 0) {
                return { error: 'No scores provided' };
            }

            // Simple average
            const sum = scores.reduce((a, b) => a + b, 0);
            const average = sum / scores.length;

            // Weighted average
            let weightedAverage = average;
            if (weights && weights.length === scores.length) {
                const totalWeight = weights.reduce((a, b) => a + b, 0);
                const weightedSum = scores.reduce((acc, score, i) => acc + score * weights[i], 0);
                weightedAverage = weightedSum / totalWeight;
            }

            // Calculate needed score for target
            let neededScore = null;
            if (targetAverage !== undefined && upcomingWeight !== undefined) {
                const currentWeight = weights ? weights.reduce((a, b) => a + b, 0) : scores.length;
                const currentSum = weights
                    ? scores.reduce((acc, score, i) => acc + score * weights[i], 0)
                    : sum;
                neededScore = ((targetAverage * (currentWeight + upcomingWeight)) - currentSum) / upcomingWeight;
            }

            return {
                scores,
                average: Math.round(average * 100) / 100,
                weightedAverage: Math.round(weightedAverage * 100) / 100,
                neededScore: neededScore !== null ? Math.round(neededScore * 100) / 100 : null,
                letterGrade: this.getLetterGrade(weightedAverage)
            };
        } catch (e) {
            return { error: `Grade calculation error: ${e.message}` };
        }
    }

    getLetterGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    // Statistics calculator
    executeStatistics(numbers, measure) {
        try {
            const sorted = [...numbers].sort((a, b) => a - b);
            const n = numbers.length;
            const sum = numbers.reduce((a, b) => a + b, 0);
            const mean = sum / n;

            // Median
            const median = n % 2 === 0
                ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
                : sorted[Math.floor(n / 2)];

            // Mode
            const counts = {};
            numbers.forEach(num => counts[num] = (counts[num] || 0) + 1);
            const maxCount = Math.max(...Object.values(counts));
            const modes = Object.keys(counts).filter(k => counts[k] === maxCount).map(Number);

            // Range
            const range = sorted[n - 1] - sorted[0];

            // Variance & Std Dev
            const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
            const stdDev = Math.sqrt(variance);

            const all = {
                numbers,
                count: n,
                sum: Math.round(sum * 1000) / 1000,
                mean: Math.round(mean * 1000) / 1000,
                median: Math.round(median * 1000) / 1000,
                mode: modes,
                range: Math.round(range * 1000) / 1000,
                variance: Math.round(variance * 1000) / 1000,
                standardDeviation: Math.round(stdDev * 1000) / 1000
            };

            if (measure === 'all') return all;
            return { [measure]: all[measure] || all[measure.replace('_', '')] };
        } catch (e) {
            return { error: `Statistics error: ${e.message}` };
        }
    }

    // Quadratic solver
    executeQuadratic(a, b, c) {
        try {
            const discriminant = b * b - 4 * a * c;

            if (discriminant < 0) {
                // Complex roots
                const realPart = -b / (2 * a);
                const imaginaryPart = Math.sqrt(-discriminant) / (2 * a);
                return {
                    equation: `${a}x² + ${b}x + ${c} = 0`,
                    discriminant,
                    rootType: 'complex',
                    x1: `${realPart} + ${imaginaryPart}i`,
                    x2: `${realPart} - ${imaginaryPart}i`
                };
            }

            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);

            return {
                equation: `${a}x² + ${b}x + ${c} = 0`,
                discriminant,
                rootType: discriminant === 0 ? 'repeated' : 'real',
                x1: Math.round(x1 * 10000) / 10000,
                x2: Math.round(x2 * 10000) / 10000
            };
        } catch (e) {
            return { error: `Quadratic solver error: ${e.message}` };
        }
    }

    // Geometry calculator
    executeGeometry(shape, dimensions, calculate) {
        try {
            const PI = Math.PI;
            let results = {};

            switch (shape) {
                case 'circle':
                    const r = dimensions.radius;
                    results = {
                        area: PI * r * r,
                        circumference: 2 * PI * r
                    };
                    break;
                case 'rectangle':
                    const w = dimensions.width, h = dimensions.height || dimensions.length;
                    results = {
                        area: w * h,
                        perimeter: 2 * (w + h)
                    };
                    break;
                case 'triangle':
                    const base = dimensions.base, height = dimensions.height;
                    results = {
                        area: 0.5 * base * height
                    };
                    if (dimensions.side1 && dimensions.side2 && dimensions.side3) {
                        results.perimeter = dimensions.side1 + dimensions.side2 + dimensions.side3;
                    }
                    break;
                case 'sphere':
                    const rs = dimensions.radius;
                    results = {
                        volume: (4 / 3) * PI * Math.pow(rs, 3),
                        surface_area: 4 * PI * rs * rs
                    };
                    break;
                case 'cylinder':
                    const rc = dimensions.radius, hc = dimensions.height;
                    results = {
                        volume: PI * rc * rc * hc,
                        surface_area: 2 * PI * rc * (rc + hc)
                    };
                    break;
                case 'cone':
                    const rco = dimensions.radius, hco = dimensions.height;
                    const slant = dimensions.slant_height || Math.sqrt(rco * rco + hco * hco);
                    results = {
                        volume: (1 / 3) * PI * rco * rco * hco,
                        surface_area: PI * rco * (rco + slant)
                    };
                    break;
                case 'cube':
                    const side = dimensions.side || dimensions.length;
                    results = {
                        volume: Math.pow(side, 3),
                        surface_area: 6 * side * side
                    };
                    break;
                case 'pyramid':
                    const bp = dimensions.base, hp = dimensions.height;
                    results = {
                        volume: (1 / 3) * bp * bp * hp
                    };
                    break;
                default:
                    return { error: `Unknown shape: ${shape}` };
            }

            // Round all results
            Object.keys(results).forEach(key => {
                results[key] = Math.round(results[key] * 10000) / 10000;
            });

            if (calculate === 'all') {
                return { shape, dimensions, ...results };
            }
            return { shape, [calculate]: results[calculate] };
        } catch (e) {
            return { error: `Geometry error: ${e.message}` };
        }
    }

    // Text statistics
    executeTextStatistics(text) {
        try {
            const words = text.trim().split(/\s+/).filter(w => w.length > 0);
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
            const syllables = this.countSyllables(text);

            // Flesch Reading Ease
            const avgWordsPerSentence = words.length / sentences.length;
            const avgSyllablesPerWord = syllables / words.length;
            const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

            // Grade level (Flesch-Kincaid)
            const gradeLevel = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

            return {
                characters: text.length,
                charactersNoSpaces: text.replace(/\s/g, '').length,
                words: words.length,
                sentences: sentences.length,
                paragraphs: paragraphs.length,
                syllables,
                avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
                fleschReadingEase: Math.round(fleschScore * 10) / 10,
                gradeLevel: Math.round(gradeLevel * 10) / 10,
                readingTime: `${Math.ceil(words.length / 200)} min`
            };
        } catch (e) {
            return { error: `Text analysis error: ${e.message}` };
        }
    }

    countSyllables(text) {
        const words = text.toLowerCase().match(/[a-z]+/g) || [];
        return words.reduce((total, word) => {
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            word = word.replace(/^y/, '');
            const syllables = word.match(/[aeiouy]{1,2}/g);
            return total + (syllables ? syllables.length : 1);
        }, 0);
    }

    // Humanize text using external API
    async executeHumanize(text) {
        if (!this.humanizerApiKey) {
            return {
                result: text,
                note: 'Humanizer API key not set. Add your HumanizeAI API key in settings to enable this feature.'
            };
        }

        try {
            const response = await fetch(this.humanizerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.humanizerApiKey}`
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                return { error: error.message || `Humanizer API error: ${response.status}` };
            }

            const data = await response.json();
            return {
                original: text,
                humanized: data.humanizedText || data.result || data.text || text,
                success: true
            };
        } catch (e) {
            return { error: `Humanizer error: ${e.message}`, original: text };
        }
    }

    // =========================================
    // INTERACTIVE TOOLS IMPLEMENTATIONS
    // =========================================

    // Analyze graph data points
    executeGraphAnalysis(xValues, yValues, operation = 'summary', target = null) {
        try {
            if (!xValues || !yValues || xValues.length !== yValues.length) {
                return { error: 'xValues and yValues must be arrays of equal length' };
            }

            const n = xValues.length;
            if (n === 0) return { error: 'No data points provided' };

            const result = {
                dataPoints: n,
                xRange: { min: Math.min(...xValues), max: Math.max(...xValues) },
                yRange: { min: Math.min(...yValues), max: Math.max(...yValues) }
            };

            // Calculate trends for each segment
            const segments = [];
            for (let i = 1; i < n; i++) {
                const xDiff = xValues[i] - xValues[i - 1];
                const yDiff = yValues[i] - yValues[i - 1];
                let trend = 'constant';
                if (yDiff > 0.001) trend = 'increasing';
                else if (yDiff < -0.001) trend = 'decreasing';

                segments.push({
                    from: { x: xValues[i - 1], y: yValues[i - 1] },
                    to: { x: xValues[i], y: yValues[i] },
                    trend: trend,
                    rateOfChange: xDiff !== 0 ? yDiff / xDiff : 0
                });
            }
            result.segments = segments;

            switch (operation) {
                case 'trend':
                    // Determine overall trend
                    const increasingCount = segments.filter(s => s.trend === 'increasing').length;
                    const decreasingCount = segments.filter(s => s.trend === 'decreasing').length;
                    const constantCount = segments.filter(s => s.trend === 'constant').length;
                    result.overallTrend = increasingCount > decreasingCount ? 'mostly increasing' :
                        decreasingCount > increasingCount ? 'mostly decreasing' :
                            'mixed/constant';
                    result.trendBreakdown = { increasing: increasingCount, decreasing: decreasingCount, constant: constantCount };
                    break;

                case 'rate_of_change':
                    // Calculate average rate of change
                    const totalRateOfChange = (yValues[n - 1] - yValues[0]) / (xValues[n - 1] - xValues[0]);
                    result.averageRateOfChange = Math.round(totalRateOfChange * 1000) / 1000;
                    result.segmentRates = segments.map(s => Math.round(s.rateOfChange * 1000) / 1000);
                    break;

                case 'find_value_at_x':
                    // Find y value at given x
                    if (target === null) return { error: 'Target x value required' };
                    for (let i = 0; i < n; i++) {
                        if (Math.abs(xValues[i] - target) < 0.001) {
                            result.valueAtX = yValues[i];
                            result.exactMatch = true;
                            break;
                        }
                    }
                    // Linear interpolation if not exact match
                    if (result.valueAtX === undefined) {
                        for (let i = 1; i < n; i++) {
                            if (xValues[i - 1] <= target && xValues[i] >= target) {
                                const ratio = (target - xValues[i - 1]) / (xValues[i] - xValues[i - 1]);
                                result.valueAtX = yValues[i - 1] + ratio * (yValues[i] - yValues[i - 1]);
                                result.interpolated = true;
                                break;
                            }
                        }
                    }
                    result.valueAtX = Math.round((result.valueAtX || 0) * 100) / 100;
                    break;

                case 'find_x_at_value':
                    // Find x value(s) where y equals target
                    if (target === null) return { error: 'Target y value required' };
                    result.xValuesAtY = [];
                    for (let i = 0; i < n; i++) {
                        if (Math.abs(yValues[i] - target) < 0.001) {
                            result.xValuesAtY.push(xValues[i]);
                        }
                    }
                    break;

                case 'max':
                    const maxY = Math.max(...yValues);
                    const maxIndex = yValues.indexOf(maxY);
                    result.maximum = { x: xValues[maxIndex], y: maxY };
                    break;

                case 'min':
                    const minY = Math.min(...yValues);
                    const minIndex = yValues.indexOf(minY);
                    result.minimum = { x: xValues[minIndex], y: minY };
                    break;

                case 'summary':
                default:
                    // Provide comprehensive summary
                    result.maximum = { x: xValues[yValues.indexOf(Math.max(...yValues))], y: Math.max(...yValues) };
                    result.minimum = { x: xValues[yValues.indexOf(Math.min(...yValues))], y: Math.min(...yValues) };

                    // Find where graph is increasing/decreasing/constant
                    let currentTrend = segments[0]?.trend;
                    let trendStart = xValues[0];
                    const trendPeriods = [];

                    for (let i = 1; i < segments.length; i++) {
                        if (segments[i].trend !== currentTrend) {
                            trendPeriods.push({
                                trend: currentTrend,
                                from: trendStart,
                                to: xValues[i],
                                yFrom: yValues[segments.findIndex(s => s.from.x === trendStart) || 0],
                                yTo: yValues[i]
                            });
                            currentTrend = segments[i].trend;
                            trendStart = xValues[i];
                        }
                    }
                    // Add last period
                    if (segments.length > 0) {
                        trendPeriods.push({
                            trend: currentTrend,
                            from: trendStart,
                            to: xValues[n - 1]
                        });
                    }
                    result.trendPeriods = trendPeriods;
                    break;
            }

            return result;
        } catch (e) {
            return { error: `Graph analysis error: ${e.message}` };
        }
    }

    // Compare values and determine relationships
    executeCompareValues(values, labels = []) {
        try {
            if (!values || values.length < 2) {
                return { error: 'At least 2 values required for comparison' };
            }

            const n = values.length;
            const labeledValues = values.map((v, i) => ({
                label: labels[i] || `Value ${i + 1}`,
                value: v
            }));

            // Sort to find rankings
            const sorted = [...labeledValues].sort((a, b) => b.value - a.value);

            const result = {
                values: labeledValues,
                largest: sorted[0],
                smallest: sorted[n - 1],
                range: sorted[0].value - sorted[n - 1].value,
                average: values.reduce((a, b) => a + b, 0) / n,
                ranking: sorted.map(v => v.label)
            };

            // Pairwise comparisons
            if (n === 2) {
                const diff = values[0] - values[1];
                result.comparison = {
                    difference: Math.abs(diff),
                    percentDifference: Math.abs((diff / values[1]) * 100),
                    relationship: diff > 0 ? `${labels[0] || 'First'} > ${labels[1] || 'Second'}` :
                        diff < 0 ? `${labels[0] || 'First'} < ${labels[1] || 'Second'}` :
                            'Equal'
                };
            }

            return result;
        } catch (e) {
            return { error: `Comparison error: ${e.message}` };
        }
    }

    // Interpret table data
    executeInterpretTable(headers = [], rows, question = '') {
        try {
            if (!rows || rows.length === 0) {
                return { error: 'No table data provided' };
            }

            const result = {
                rowCount: rows.length,
                columnCount: rows[0]?.length || 0,
                headers: headers
            };

            // Try to identify numeric columns
            const numericColumns = [];
            for (let col = 0; col < result.columnCount; col++) {
                const values = rows.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
                if (values.length >= rows.length * 0.5) {
                    numericColumns.push({
                        index: col,
                        header: headers[col] || `Column ${col + 1}`,
                        values: values,
                        sum: values.reduce((a, b) => a + b, 0),
                        average: values.reduce((a, b) => a + b, 0) / values.length,
                        min: Math.min(...values),
                        max: Math.max(...values)
                    });
                }
            }
            result.numericColumns = numericColumns;

            // Find patterns
            result.patterns = [];

            // Check for increasing/decreasing patterns in numeric columns
            numericColumns.forEach(col => {
                const values = col.values;
                let increasing = true, decreasing = true;
                for (let i = 1; i < values.length; i++) {
                    if (values[i] < values[i - 1]) increasing = false;
                    if (values[i] > values[i - 1]) decreasing = false;
                }
                if (increasing) result.patterns.push(`${col.header} is consistently increasing`);
                if (decreasing) result.patterns.push(`${col.header} is consistently decreasing`);
            });

            // Simple row lookup if question mentions specific value
            if (question) {
                result.queryResponse = this.searchTable(headers, rows, question);
            }

            return result;
        } catch (e) {
            return { error: `Table interpretation error: ${e.message}` };
        }
    }

    // Helper to search table for specific values
    searchTable(headers, rows, query) {
        const lowerQuery = query.toLowerCase();
        const matches = [];

        rows.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                if (cell.toLowerCase().includes(lowerQuery)) {
                    matches.push({
                        row: rowIndex + 1,
                        column: headers[colIndex] || `Column ${colIndex + 1}`,
                        value: cell,
                        rowData: row
                    });
                }
            });
        });

        return matches.length > 0 ? matches : 'No matches found';
    }

    async sendMessage(messages, modelId, options = {}) {
        if (!this.apiKey) {
            throw new Error('API key not set. Please add your OpenRouter API key in the extension popup.');
        }

        const requestBody = {
            model: modelId,
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2048
        };

        // Add tools for math questions
        if (options.tools) {
            requestBody.tools = options.tools;
            requestBody.tool_choice = 'auto';
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://edgenuity-ai-solver.extension',
                    'X-Title': 'Edgenuity AI Solver'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const message = data.choices[0]?.message;

            // Handle tool calls
            if (message?.tool_calls && message.tool_calls.length > 0) {
                return await this.handleToolCalls(messages, message, modelId, options);
            }

            return {
                success: true,
                content: message?.content || 'No response received',
                model: data.model,
                usage: data.usage
            };
        } catch (error) {
            console.error('[Edgenuity AI] API Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Handle tool calls from the AI
    async handleToolCalls(originalMessages, assistantMessage, modelId, options) {
        console.log('[Edgenuity AI] Processing tool calls:', assistantMessage.tool_calls);

        // Add assistant message with tool calls
        const updatedMessages = [
            ...originalMessages,
            assistantMessage
        ];

        // Execute each tool call and add results
        for (const toolCall of assistantMessage.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await this.executeToolCall(toolCall.function.name, args);

            console.log(`[Edgenuity AI] Tool ${toolCall.function.name}:`, args, '->', result);

            updatedMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            });
        }

        // Get final response with tool results
        const finalResponse = await this.sendMessage(updatedMessages, modelId, {
            ...options,
            tools: undefined // Don't allow more tool calls in follow-up
        });

        return finalResponse;
    }

    async solveQuestion(questionText, questionType = 'default', modelKey = 'balanced') {
        const config = window.EDGENUITY_CONFIG;
        const model = config.MODELS[modelKey] || config.MODELS.balanced;
        const systemPrompt = config.SYSTEM_PROMPTS[questionType] || config.SYSTEM_PROMPTS.default;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: questionText }
        ];

        // Add tools based on question type
        const options = {};

        // Base tools + Browser tools are always available for interaction
        const baseTools = [...OpenRouterAPI.BROWSER_TOOLS];

        if (questionType === 'math') {
            // For math, include both math tools and interactive tools for graphs
            options.tools = [...baseTools, ...OpenRouterAPI.MATH_TOOLS, ...OpenRouterAPI.INTERACTIVE_TOOLS];
        } else if (questionType === 'writing') {
            options.tools = [...baseTools, ...OpenRouterAPI.WRITING_TOOLS];
        } else if (questionType === 'interactive') {
            // Interactive questions get interactive tools + basic math tools + Browser tools
            options.tools = [...baseTools, ...OpenRouterAPI.INTERACTIVE_TOOLS, ...OpenRouterAPI.MATH_TOOLS];
        } else {
            // Default gets generic tools
            options.tools = [...baseTools, ...OpenRouterAPI.MATH_TOOLS];
        }

        const result = await this.sendMessage(messages, model.id, options);

        // Automatically humanize writing responses if humanizer key is set
        if (result.success && questionType === 'writing' && this.humanizerApiKey) {
            console.log('[Edgenuity AI] Auto-humanizing writing response...');
            const humanized = await this.executeHumanize(result.content);
            if (humanized.humanized && humanized.success) {
                result.content = humanized.humanized;
                result.wasHumanized = true;
                console.log('[Edgenuity AI] Response humanized successfully');
            }
        }

        return result;
    }

    // Solve question using screenshot (vision-based)
    async solveWithScreenshot(screenshotDataUrl, additionalContext = '') {
        const config = window.EDGENUITY_CONFIG;
        const model = config.MODELS.vision;
        const systemPrompt = config.SYSTEM_PROMPTS.vision;

        if (!model) {
            return { success: false, error: 'Vision model not configured' };
        }

        // Build the message with image content
        const userContent = [
            {
                type: 'image_url',
                image_url: {
                    url: screenshotDataUrl
                }
            }
        ];

        // Add text context if provided (like additional dropdown info)
        if (additionalContext) {
            userContent.push({
                type: 'text',
                text: additionalContext
            });
        } else {
            userContent.push({
                type: 'text',
                text: 'Please analyze this screenshot and provide the correct answer(s) for the question shown.'
            });
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ];

        // Enable tools for vision model
        const options = {
            tools: [...OpenRouterAPI.BROWSER_TOOLS, ...OpenRouterAPI.MATH_TOOLS, ...OpenRouterAPI.INTERACTIVE_TOOLS]
        };

        try {
            const result = await this.sendMessage(messages, model.id, options);
            result.usedVision = true;
            return result;
        } catch (error) {
            console.error('[Edgenuity AI] Vision API error:', error);
            return {
                success: false,
                error: error.message,
                usedVision: true
            };
        }
    }

    // Chat with context (for interactive chat feature)
    async chatWithContext(conversationMessages, screenshotDataUrl = null, modelId = 'google/gemini-2.5-flash-lite') {
        try {
            // Build the system prompt for chat context
            const systemPrompt = `You are an AI assistant that provides DIRECT ANSWERS to questions shown on screen.
When analyzing a screenshot or question, provide the correct answer immediately.
Format your response clearly with the answer prominently displayed.
If there are multiple choice options, clearly state which option is correct.
If it's a fill-in-the-blank or short answer, provide the exact text to enter.
For essays or written responses, provide a complete, well-written answer.
Be concise but thorough - give the answer first, then a brief explanation if needed.`;

            // Build messages array
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Process conversation messages
            for (let i = 0; i < conversationMessages.length; i++) {
                const msg = conversationMessages[i];

                // For the last user message, include screenshot if provided
                if (i === conversationMessages.length - 1 && msg.role === 'user' && screenshotDataUrl) {
                    messages.push({
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: screenshotDataUrl
                                }
                            },
                            {
                                type: 'text',
                                text: msg.content
                            }
                        ]
                    });
                } else {
                    messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            }

            const result = await this.sendMessage(messages, modelId, {
                temperature: 0.7,
                maxTokens: 2048
            });

            if (result.success) {
                return result.content;
            } else {
                throw new Error(result.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('[Edgenuity AI] Chat error:', error);
            throw error;
        }
    }

    // Detect question type based on content
    detectQuestionType(questionText) {
        const patterns = window.EDGENUITY_CONFIG.QUESTION_PATTERNS;

        // Check for interactive elements first (they take priority)
        if (patterns.interactive && patterns.interactive.test(questionText)) {
            // If it's interactive, also check if it's specifically math-related
            if (patterns.math.test(questionText)) return 'math';
            return 'interactive';
        }

        if (patterns.math.test(questionText)) return 'math';
        if (patterns.writing.test(questionText)) return 'writing';
        if (patterns.science.test(questionText)) return 'science';

        return 'default';
    }
}

// Export for use in content script
if (typeof window !== 'undefined') {
    window.OpenRouterAPI = OpenRouterAPI;
}
