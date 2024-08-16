const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

const REPOS = [
    'linuxfandudeguy/theparrotcollection',
    'linuxfandudeguy/flagparrots',
    'linuxfandudeguy/partyguests'
];

const API_BASE_URL = 'https://api.github.com/repos';
const port = 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Use environment variable

const app = express();

// Function to get a random image from a specific repository
const getRandomImageFromRepo = async (repo) => {
    const files = await getImagesFromDir(repo, '');
    if (files.length === 0) {
        const hdFiles = await getImagesFromDir(repo, '/hd');
        return hdFiles.length > 0 ? hdFiles[Math.floor(Math.random() * hdFiles.length)] : null;
    }
    return files[Math.floor(Math.random() * files.length)];
};

const getImagesFromDir = async (repo, directory) => {
    const files = await getFileList(repo, directory);
    const allFiles = [];

    const exploreFiles = async (fileList) => {
        for (const file of fileList) {
            if (file.type === 'file') {
                if (file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) { // Check for image files
                    allFiles.push(file);
                }
            } else if (file.type === 'dir') {
                const subFiles = await getImagesFromDir(repo, file.path);
                await exploreFiles(subFiles);
            }
        }
    };

    await exploreFiles(files);
    return allFiles;
};

const getFileList = async (repo, path = '') => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${repo}/contents${path}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching file list for ${repo}:`, error.message);
        return [];
    }
};

const getMimeType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'bmp':
            return 'image/bmp';
        case 'webp':
            return 'image/webp';
        default:
            return 'application/octet-stream';
    }
};

app.get('/api/parrot/random', async (req, res) => {
    try {
        const repo = REPOS[Math.floor(Math.random() * REPOS.length)];
        const image = await getRandomImageFromRepo(repo);
        if (!image) {
            return res.status(404).send('<h1>No images found.</h1>');
        }

        const imageUrl = image.download_url;
        const mimeType = getMimeType(image.name);
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        res.setHeader('Content-Type', mimeType);
        response.data.pipe(res);
    } catch (error) {
        console.error(`Error fetching image:`, error.message);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

app.get('/api/parrot/all', async (req, res) => {
    try {
        const allImages = [];
        for (const repo of REPOS) {
            const images = await getImagesFromDir(repo, '');
            allImages.push(...images);
        }
        res.json(allImages);
    } catch (error) {
        console.error(`Error fetching all images:`, error.message);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

app.get('/api/parrot/repo/:repo', async (req, res) => {
    const { repo } = req.params;
    try {
        const images = await getImagesFromDir(repo, '');
        res.json(images);
    } catch (error) {
        console.error(`Error fetching images from repository ${repo}:`, error.message);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

app.get('/api/parrot/count', async (req, res) => {
    try {
        let totalCount = 0;
        for (const repo of REPOS) {
            const images = await getImagesFromDir(repo, '');
            totalCount += images.length;
        }
        res.json({ totalCount });
    } catch (error) {
        console.error(`Error fetching total image count:`, error.message);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

app.get('/api/parrot/random/:repo', async (req, res) => {
    const { repo } = req.params;
    try {
        const image = await getRandomImageFromRepo(repo);
        if (!image) {
            return res.status(404).send('<h1>No images found.</h1>');
        }

        const imageUrl = image.download_url;
        const mimeType = getMimeType(image.name);
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        res.setHeader('Content-Type', mimeType);
        response.data.pipe(res);
    } catch (error) {
        console.error(`Error fetching random image from repository ${repo}:`, error.message);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
