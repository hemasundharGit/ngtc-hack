pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
  }

  environment {
    FRONTEND_IMAGE = "medigenie/frontend"
    BACKEND_IMAGE = "medigenie/backend"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    DOCKER_BUILDKIT = "1"
    COMPOSE_DOCKER_CLI_BUILD = "1"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Frontend Quality') {
      agent {
        docker {
          image 'node:20-bookworm-slim'
          reuseNode true
        }
      }
      steps {
        sh 'npm ci'
        sh 'npm run lint || true'
        sh 'npx tsc --noEmit'
      }
    }

    stage('Backend Quality') {
      agent {
        docker {
          image 'python:3.12-slim'
          reuseNode true
        }
      }
      steps {
        sh 'python -m venv .jenkins-venv'
        sh '. .jenkins-venv/bin/activate && pip install --upgrade pip && pip install -r mcrd/requirements.txt'
        sh '. .jenkins-venv/bin/activate && python -m py_compile mcrd/main.py mcrd/api_services.py'
      }
    }

    stage('Trivy Scan') {
      agent {
        docker {
          image 'aquasec/trivy:0.57.1'
          reuseNode true
          args '--entrypoint=""'
        }
      }
      steps {
        sh 'trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 1 --no-progress .'
      }
    }

    stage('OWASP Dependency Check') {
      steps {
        dependencyCheck additionalArguments: '--scan . --format ALL --project MediGenie --disableAssembly',
          odcInstallation: 'dependency-check'
        dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
      }
    }

    stage('Build Docker Images') {
      steps {
        script {
          sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} --build-arg NEXT_PUBLIC_API_BASE_URL=http://backend:8000 ."
          sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ./mcrd"
        }
      }
    }

    stage('Push Docker Images') {
      when {
        branch 'main'
      }
      steps {
        script {
          docker.withRegistry("${env.DOCKER_REGISTRY_URL ?: 'https://index.docker.io/v1/'}", "${env.DOCKER_CREDENTIALS_ID ?: 'dockerhub-creds'}") {
            sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
            sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
          }
        }
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        sh 'docker compose down || true'
        sh 'docker compose up -d --build'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'dependency-check-report.*', allowEmptyArchive: true
      junit allowEmptyResults: true, testResults: '**/junit*.xml'
      cleanWs(deleteDirs: true, disableDeferredWipeout: true)
    }
  }
}
